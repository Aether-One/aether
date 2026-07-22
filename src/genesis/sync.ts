import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger, type RetryOptions } from "../providers/retry.js";
import { BASE_PROMPT, PROMPT_SUFFIX, SYNC_PLANNER_PROMPT } from "../prompts/index.js";
import {
  DOC_DEFINITIONS,
  buildCustomDocDefinition,
  buildSectionPatchPrompt,
  buildDocUpdatePrompt,
} from "./docs.js";
import { buildFingerprint, getGitInfo } from "./fingerprint.js";
import { parsePlan, extractJsonArray } from "./planner.js";
import type {
  ProjectContext,
  DocDefinition,
  DocMeta,
  Snapshot,
  FileDiff,
  SyncPlan,
  SectionPatch,
  FileFingerprint,
} from "./types.js";

export type { DocMeta, Snapshot, FileDiff, SyncPlan, SectionPatch } from "./types.js";

const MAX_PLAN_ATTEMPTS = 3;
const MAX_LISTED_FILES = 60;
const ANCHOR_IDS = ["system-overview", "folder-structure", "tech-stack", "ai-context"];

/** The snapshot lives at .aether/settings/context.json; the older layout kept it at the root. */
function snapshotPath(rootDir: string): string {
  return join(rootDir, ".aether", "settings", "context.json");
}

function resolveSnapshotPath(rootDir: string): string | null {
  const current = snapshotPath(rootDir);
  if (existsSync(current)) return current;
  const legacy = join(rootDir, ".aether", "context.json");
  return existsSync(legacy) ? legacy : null;
}

export async function loadSnapshot(rootDir: string): Promise<Snapshot | null> {
  const path = resolveSnapshotPath(rootDir);
  if (!path) return null;

  try {
    const parsed = JSON.parse(await readFile(path, "utf-8"));
    // Reject the pre-fingerprint shape — /sync has nothing to diff against.
    if (!parsed?.files || typeof parsed.files !== "object") return null;
    return parsed as Snapshot;
  } catch {
    return null;
  }
}

export function diffFingerprint(prev: Record<string, FileFingerprint>, context: ProjectContext): FileDiff {
  const next = buildFingerprint(context);
  const diff: FileDiff = { added: [], modified: [], deleted: [] };

  for (const path of Object.keys(next)) {
    if (!prev[path]) diff.added.push(path);
    else if (prev[path].hash !== next[path].hash) diff.modified.push(path);
  }
  for (const path of Object.keys(prev)) {
    if (!next[path]) diff.deleted.push(path);
  }

  return diff;
}

export function hasChanges(diff: FileDiff): boolean {
  return diff.added.length + diff.modified.length + diff.deleted.length > 0;
}

export interface PlanSyncOptions {
  onRetry?: RetryOptions["onRetry"];
  onResolved?: (plan: SyncPlan) => void;
}

export async function planSync(
  digest: string,
  diff: FileDiff,
  existingDocs: DocMeta[],
  gitLog: string | null,
  provider: LLMProvider,
  model: string,
  options?: PlanSyncOptions,
): Promise<SyncPlan> {
  const onRetry = options?.onRetry ?? createRetryLogger();
  const changes = buildChangeSummary(diff, existingDocs, gitLog);
  const prompt = `${BASE_PROMPT}\n\n${digest}\n\n${changes}\n\n${SYNC_PLANNER_PROMPT}\n\n${PROMPT_SUFFIX}`;

  let parsed: ReturnType<typeof parsePlan> = { catalogIds: [], customDocs: [] };
  let sawValidArray = false;
  let gotResponse = false;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS; attempt++) {
    try {
      const response = await chatWithRetry(
        provider,
        { model, messages: [{ role: "user", content: prompt }], temperature: attempt === 1 ? 0.1 : 0 },
        { onRetry },
      );
      gotResponse = true;
      // A valid array — even an empty one — is the model deliberately saying what to do.
      if (extractJsonArray(response.content)) {
        sawValidArray = true;
        parsed = parsePlan(response.content);
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!gotResponse && lastError) throw lastError;

  const plan = resolvePlan(parsed.catalogIds, parsed.customDocs, existingDocs);

  // Unparseable after every attempt but files DID change: refresh the whole-project
  // anchor docs rather than silently skipping. An intentional [] is respected.
  if (!sawValidArray && plan.regenerate.length === 0 && plan.add.length === 0) {
    plan.regenerate = existingDocs
      .filter((d) => ANCHOR_IDS.includes(d.id))
      .map(docDefinitionFromMeta)
      .filter((d): d is DocDefinition => d !== null);
  }

  options?.onResolved?.(plan);
  return plan;
}

function resolvePlan(
  catalogIds: string[],
  customDocs: { path: string; title: string; focus: string }[],
  existingDocs: DocMeta[],
): SyncPlan {
  const existingById = new Map(existingDocs.map((d) => [d.id, d]));
  const existingPaths = new Set(existingDocs.map((d) => d.outputPath));
  const seen = new Set<string>();
  const regenerate: DocDefinition[] = [];
  const add: DocDefinition[] = [];

  for (const id of catalogIds) {
    const existing = existingById.get(id);
    if (existing) {
      const def = docDefinitionFromMeta(existing);
      if (def && !seen.has(def.outputPath)) {
        seen.add(def.outputPath);
        regenerate.push(def);
      }
      continue;
    }
    const catalog = DOC_DEFINITIONS.find((d) => d.id === id);
    if (catalog && !existingPaths.has(catalog.outputPath) && !seen.has(catalog.outputPath)) {
      seen.add(catalog.outputPath);
      add.push(catalog);
    }
  }

  for (const spec of customDocs) {
    const outputPath = `docs/${spec.path}`;
    if (existingPaths.has(outputPath) || seen.has(outputPath)) continue;
    seen.add(outputPath);
    add.push(buildCustomDocDefinition(spec));
  }

  return { regenerate, add };
}

/** Rebuilds a runnable DocDefinition (with buildPrompt) from stored snapshot metadata. */
export function docDefinitionFromMeta(meta: DocMeta): DocDefinition | null {
  const catalog = DOC_DEFINITIONS.find((d) => d.id === meta.id);
  if (catalog) return catalog;
  if (meta.id.startsWith("custom:")) {
    return buildCustomDocDefinition({
      path: meta.outputPath.replace(/^docs\//, ""),
      title: meta.title,
      focus: meta.summary,
    });
  }
  return null;
}

export function metaFromDefinition(def: DocDefinition): DocMeta {
  return { id: def.id, outputPath: def.outputPath, title: def.title, section: def.section, summary: def.summary };
}

/** Merges existing doc metas with newly added ones, de-duplicated by output path. */
export function mergeDocMetas(existing: DocMeta[], added: DocDefinition[]): DocMeta[] {
  const byPath = new Map(existing.map((d) => [d.outputPath, d]));
  for (const def of added) byPath.set(def.outputPath, metaFromDefinition(def));
  return [...byPath.values()];
}

/** Writes `.aether/settings/context.json` — the fingerprint + doc set for the next /sync. */
export async function writeSnapshot(
  rootDir: string,
  meta: { provider: string; model: string },
  context: ProjectContext,
  docs: DocMeta[],
): Promise<void> {
  await mkdir(join(rootDir, ".aether", "settings"), { recursive: true });
  await writeFile(
    snapshotPath(rootDir),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        project: context.name,
        provider: meta.provider,
        model: meta.model,
        git: getGitInfo(rootDir) ?? undefined,
        files: buildFingerprint(context),
        docs,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

/** Compact change text passed to an update prompt so the model knows what to patch. */
export function formatChanges(diff: FileDiff, gitLog: string | null): string {
  const parts: string[] = [];
  const line = (label: string, files: string[]) => {
    if (files.length === 0) return;
    const shown = files.slice(0, 40).join(", ");
    parts.push(`${label}: ${shown}${files.length > 40 ? `, +${files.length - 40} more` : ""}`);
  };

  line("Added files", diff.added);
  line("Modified files", diff.modified);
  line("Removed files", diff.deleted);
  if (gitLog) parts.push(`Recent commit messages:\n${gitLog}`);

  return parts.join("\n") || "No file-level changes detected.";
}

// --- Section-level patching: refresh a doc by replacing ONLY the affected
// --- sections, keeping every other section byte-for-byte.

interface RawSection {
  key: string;
  heading: string;
  text: string;
}

const H2_RE = /^##[ \t].*$/gm;

function normHeading(heading: string): string {
  return heading.replace(/^#+\s*/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function splitSections(md: string): { preamble: string; sections: RawSection[] } {
  const matches = [...md.matchAll(H2_RE)];
  if (matches.length === 0) return { preamble: md, sections: [] };

  const preamble = md.slice(0, matches[0].index);
  const sections: RawSection[] = [];
  for (let k = 0; k < matches.length; k++) {
    const start = matches[k].index ?? 0;
    const end = k + 1 < matches.length ? matches[k + 1].index ?? md.length : md.length;
    const headingLine = matches[k][0];
    sections.push({
      key: normHeading(headingLine),
      heading: headingLine.replace(/^#+\s*/, "").trim(),
      text: md.slice(start, end),
    });
  }
  return { preamble, sections };
}

/** Ensures a section body carries its heading and a trailing blank line for clean joins. */
function normalizeSection(patch: SectionPatch): string {
  let body = patch.content.trim();
  if (!body.startsWith("#")) body = `## ${patch.heading.replace(/^#+\s*/, "").trim()}\n\n${body}`;
  return `${body}\n\n`;
}

/**
 * Rebuilds the document from its existing sections, swapping in the patched ones and
 * inserting new ones. Sections not named in `patches` are emitted unchanged — the whole
 * point: the model never gets to touch text it didn't explicitly rewrite.
 */
export function applySectionPatch(existingDoc: string, patches: SectionPatch[]): string {
  const { preamble, sections } = splitSections(existingDoc);
  if (sections.length === 0 || patches.length === 0) return existingDoc;

  const byKey = new Map(patches.map((p) => [normHeading(p.heading), p]));
  const used = new Set<string>();

  const rebuilt = sections.map((sec) => {
    const patch = byKey.get(sec.key);
    if (!patch) return { key: sec.key, text: sec.text };
    used.add(sec.key);
    return { key: sec.key, text: normalizeSection(patch) };
  });

  // Patches that didn't match an existing section are NEW sections — insert after their
  // anchor if given, else append. Never remove anything.
  for (const patch of patches) {
    const key = normHeading(patch.heading);
    if (used.has(key)) continue;
    used.add(key);
    const entry = { key, text: normalizeSection(patch) };
    const afterIdx = patch.after ? rebuilt.findIndex((s) => s.key === normHeading(patch.after!)) : -1;
    if (afterIdx >= 0) rebuilt.splice(afterIdx + 1, 0, entry);
    else rebuilt.push(entry);
  }

  return `${preamble}${rebuilt.map((s) => s.text).join("")}`.trimEnd() + "\n";
}

function toSectionPatches(arr: unknown[]): SectionPatch[] {
  const out: SectionPatch[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.heading !== "string" || typeof obj.content !== "string") continue;
    out.push({
      heading: obj.heading,
      content: obj.content,
      after: typeof obj.after === "string" ? obj.after : undefined,
    });
  }
  return out;
}

const SECTION_STRICT =
  "CRITICAL: Output ONLY the raw JSON array of changed sections. No prose, no code fences.";

/**
 * Refreshes an existing doc using section-level patching: only the sections the model
 * marks as affected are rewritten; everything else is preserved exactly. Falls back to
 * a conservative full-document update if the doc has no sections or the model won't
 * produce a valid patch list (so a change is never silently dropped).
 */
export async function refreshDoc(
  doc: DocDefinition,
  context: string,
  existingDoc: string,
  changes: string,
  provider: LLMProvider,
  model: string,
  signal?: AbortSignal,
): Promise<string> {
  const { sections } = splitSections(existingDoc);
  if (sections.length === 0) {
    return fullUpdate(doc, context, existingDoc, changes, provider, model, signal);
  }

  const prompt = buildSectionPatchPrompt(doc, context, existingDoc, changes, sections.map((s) => s.heading));

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (signal?.aborted) break;
    const content = attempt === 1 ? prompt : `${prompt}\n\n${SECTION_STRICT}`;
    const response = await chatWithRetry(provider, {
      model,
      messages: [{ role: "user", content }],
      temperature: 0,
      signal,
    });
    const arr = extractJsonArray(response.content);
    if (arr) return applySectionPatch(existingDoc, toSectionPatches(arr));
  }

  return fullUpdate(doc, context, existingDoc, changes, provider, model, signal);
}

async function fullUpdate(
  doc: DocDefinition,
  context: string,
  existingDoc: string,
  changes: string,
  provider: LLMProvider,
  model: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await chatWithRetry(provider, {
    model,
    messages: [{ role: "user", content: buildDocUpdatePrompt(doc, context, existingDoc, changes) }],
    temperature: 0,
    signal,
  });
  return response.content;
}

function buildChangeSummary(diff: FileDiff, existingDocs: DocMeta[], gitLog: string | null): string {
  const parts: string[] = ["# CHANGES SINCE THE DOCS WERE GENERATED"];

  const section = (label: string, files: string[]) => {
    if (files.length === 0) return;
    const shown = files.slice(0, MAX_LISTED_FILES).map((f) => `- ${f}`);
    if (files.length > MAX_LISTED_FILES) shown.push(`- … and ${files.length - MAX_LISTED_FILES} more`);
    parts.push(`## ${label} (${files.length})`, shown.join("\n"));
  };

  section("Added files", diff.added);
  section("Modified files", diff.modified);
  section("Removed files", diff.deleted);

  if (gitLog) parts.push("## Commit messages in this range", "```", gitLog, "```");

  parts.push(
    "## Existing docs (ID — title)",
    existingDocs.map((d) => `- ${d.id} — ${d.title}`).join("\n"),
  );

  return parts.join("\n\n");
}
