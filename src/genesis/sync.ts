import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger, type RetryOptions } from "../providers/retry.js";
import { getSettingsDir } from "../config/index.js";
import { BASE_PROMPT, PROMPT_SUFFIX, SYNC_PLANNER_PROMPT } from "../prompts/index.js";
import type { ProjectContext } from "./context.js";
import {
  DOC_DEFINITIONS,
  buildCustomDocDefinition,
  type DocDefinition,
  type DocSection,
} from "./docs.js";
import { buildFingerprint, getGitInfo, type FileFingerprint } from "./fingerprint.js";
import { parsePlan, extractJsonArray } from "./planner.js";

/** Metadata stored per doc in the snapshot — enough to rebuild the index and regenerate. */
export interface DocMeta {
  id: string;
  outputPath: string;
  title: string;
  section: DocSection;
  summary: string;
}

/** `.aether/settings/context.json` — the point a genesis/sync run was taken from. */
export interface Snapshot {
  generatedAt: string;
  provider: string;
  model: string;
  git?: { commit: string; branch: string; dirty: boolean };
  files: Record<string, FileFingerprint>;
  docs: DocMeta[];
}

export interface FileDiff {
  added: string[];
  modified: string[];
  deleted: string[];
}

/** A sync plan: existing docs to refresh, and brand-new docs to add. Never deletes. */
export interface SyncPlan {
  regenerate: DocDefinition[];
  add: DocDefinition[];
}

const MAX_PLAN_ATTEMPTS = 3;
const MAX_LISTED_FILES = 60;
const ANCHOR_IDS = ["system-overview", "folder-structure", "tech-stack", "ai-context"];

export async function loadSnapshot(rootDir: string): Promise<Snapshot | null> {
  const path = join(getSettingsDir(rootDir), "context.json");
  if (!existsSync(path)) return null;

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
  const settingsDir = getSettingsDir(rootDir);
  await mkdir(settingsDir, { recursive: true });
  await writeFile(
    join(settingsDir, "context.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
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
