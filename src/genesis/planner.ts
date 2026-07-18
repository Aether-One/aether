import chalk from "chalk";
import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger } from "../providers/retry.js";
import { DOC_DEFINITIONS, buildCustomDocDefinition, type DocDefinition, type CustomDocSpec } from "./docs.js";
import { BASE_PROMPT, PROMPT_SUFFIX, PLANNER_PROMPT } from "../prompts/index.js";

const DIM = chalk.dim;
const ACCENT = chalk.hex("#895bf4");
const WARN = chalk.yellow;

/** Always generated regardless of what the planner returns — keeps every project anchored. */
const CORE_IDS = ["system-overview", "folder-structure", "tech-stack", "ai-context"];
const MAX_CUSTOM_DOCS = 5;

export async function planDocs(
  contextPrompt: string,
  provider: LLMProvider,
  model: string,
): Promise<DocDefinition[]> {
  const prompt = `${BASE_PROMPT}\n\n${contextPrompt}\n\n${PLANNER_PROMPT}\n\n${PROMPT_SUFFIX}`;

  const response = await chatWithRetry(
    provider,
    {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    },
    { onRetry: createRetryLogger() },
  );

  const plan = parsePlan(response.content);

  if (plan.catalogIds.length === 0 && plan.customDocs.length === 0) {
    showPlannerThought(CORE_IDS, [], "could not parse LLM response, using minimum set");
    return DOC_DEFINITIONS.filter((d) => CORE_IDS.includes(d.id));
  }

  const catalogIds = [...new Set([...CORE_IDS, ...plan.catalogIds])];
  const catalogDocs = DOC_DEFINITIONS.filter((d) => catalogIds.includes(d.id));

  const customDocs = dedupeCustomDocs(plan.customDocs, catalogDocs)
    .slice(0, MAX_CUSTOM_DOCS)
    .map(buildCustomDocDefinition);

  showPlannerThought(catalogIds, customDocs.map((d) => d.label));
  return [...catalogDocs, ...customDocs];
}

function showPlannerThought(catalogIds: string[], customLabels: string[], note?: string): void {
  process.stdout.write(`\n     ${ACCENT("⟡")} ${DIM("Planner decided:")}`);
  if (note) {
    process.stdout.write(` ${WARN(`[${note}]`)}`);
  }
  process.stdout.write("\n");

  for (const id of catalogIds) {
    const doc = DOC_DEFINITIONS.find((d) => d.id === id);
    process.stdout.write(`       ${DIM("•")} ${doc ? doc.label : id}\n`);
  }
  for (const label of customLabels) {
    process.stdout.write(`       ${DIM("•")} ${label} ${DIM("(custom)")}\n`);
  }
  process.stdout.write("\n");
}

interface ParsedPlan {
  catalogIds: string[];
  customDocs: CustomDocSpec[];
}

function parsePlan(content: string): ParsedPlan {
  const raw = extractJsonArray(content);
  if (!raw) return { catalogIds: [], customDocs: [] };

  const catalogIds: string[] = [];
  const customDocs: CustomDocSpec[] = [];

  for (const entry of raw) {
    if (typeof entry === "string") {
      catalogIds.push(entry);
      continue;
    }

    if (typeof entry !== "object" || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.path !== "string" || typeof obj.title !== "string") continue;

    const path = sanitizeDocPath(obj.path);
    if (!path) continue;

    customDocs.push({
      path,
      title: obj.title.slice(0, 120),
      focus: typeof obj.focus === "string" ? obj.focus.slice(0, 500) : "",
    });
  }

  return { catalogIds, customDocs };
}

function extractJsonArray(content: string): unknown[] | null {
  const trimmed = content.trim();

  // Direct JSON array
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not direct JSON
  }

  // Find a JSON array anywhere in the text (e.g. wrapped in a code fence)
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Malformed
    }
  }

  return null;
}

/**
 * Keeps LLM-proposed doc paths inside docs/ — rejects traversal and
 * absolute paths instead of trusting model output to write files.
 */
function sanitizeDocPath(rawPath: string): string | null {
  let path = rawPath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!path) return null;
  if (!path.toLowerCase().endsWith(".md")) path += ".md";

  const segments = path.split("/").filter((s) => s.length > 0 && s !== ".");
  if (segments.length === 0 || segments.some((s) => s === "..")) return null;

  return segments.join("/");
}

function dedupeCustomDocs(customDocs: CustomDocSpec[], catalogDocs: DocDefinition[]): CustomDocSpec[] {
  const taken = new Set(catalogDocs.map((d) => d.outputPath));
  const seen = new Set<string>();
  const result: CustomDocSpec[] = [];

  for (const doc of customDocs) {
    const outputPath = `docs/${doc.path}`;
    if (taken.has(outputPath) || seen.has(outputPath)) continue;
    seen.add(outputPath);
    result.push(doc);
  }

  return result;
}
