import chalk from "chalk";
import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger, type RetryOptions } from "../providers/retry.js";
import { DOC_DEFINITIONS, buildCustomDocDefinition, type DocDefinition, type CustomDocSpec } from "./docs.js";
import { BASE_PROMPT, PROMPT_SUFFIX, PLANNER_PROMPT } from "../prompts/index.js";

const DIM = chalk.dim;
const ACCENT = chalk.hex("#895bf4");
const WARN = chalk.yellow;

/**
 * Always generated regardless of what the planner returns — keeps every project anchored.
 * Two anchors for two audiences: the architecture/AI set (system-overview, folder-structure,
 * tech-stack, ai-context) and the human guides (getting-started, onboarding).
 */
const CORE_IDS = [
  "getting-started",
  "onboarding",
  "system-overview",
  "folder-structure",
  "tech-stack",
  "ai-context",
];
const MAX_CUSTOM_DOCS = 5;
// How many times we ask the model for a plan before giving up and using the
// core set. Chatty/reasoning models often wrap the array in prose on the first
// try; a stronger nudge on later attempts usually gets a clean array.
const MAX_PLAN_ATTEMPTS = 3;

const STRICT_FORMAT_REMINDER =
  "CRITICAL: Output ONLY the raw JSON array. No prose, no explanation, no <think> blocks, " +
  "no markdown code fences. Your entire response must start with [ and end with ].";

export interface PlanDocsOptions {
  /** Called on each retry attempt so the caller can render it (e.g. above a spinner). */
  onRetry?: RetryOptions["onRetry"];
  /**
   * Called once the plan is resolved, right before the planner thought is printed.
   * Lets the caller stop any live spinner so its output doesn't collide with ours.
   */
  onResolved?: (docs: DocDefinition[]) => void;
}

export async function planDocs(
  contextPrompt: string,
  provider: LLMProvider,
  model: string,
  options?: PlanDocsOptions,
): Promise<DocDefinition[]> {
  const onRetry = options?.onRetry ?? createRetryLogger();
  const basePrompt = `${BASE_PROMPT}\n\n${contextPrompt}\n\n${PLANNER_PROMPT}\n\n${PROMPT_SUFFIX}`;

  let plan: ParsedPlan = { catalogIds: [], customDocs: [] };
  let gotResponse = false;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS; attempt++) {
    // Reinforce the output format on retries — and drop temperature to 0 so the
    // model is less likely to editorialize around the array a second time.
    const prompt = attempt === 1 ? basePrompt : `${basePrompt}\n\n${STRICT_FORMAT_REMINDER}`;

    try {
      const response = await chatWithRetry(
        provider,
        {
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: attempt === 1 ? 0.1 : 0,
        },
        { onRetry },
      );
      gotResponse = true;
      plan = parsePlan(response.content);
      if (plan.catalogIds.length > 0 || plan.customDocs.length > 0) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (plan.catalogIds.length === 0 && plan.customDocs.length === 0) {
    // Never even reached the model (network/timeout on every attempt) — surface
    // the real error instead of silently pretending we planned something.
    if (!gotResponse && lastError) throw lastError;

    // We got responses but none were parseable after every attempt — fall back
    // to the core set as a genuine last resort.
    const docs = DOC_DEFINITIONS.filter((d) => CORE_IDS.includes(d.id));
    options?.onResolved?.(docs);
    showPlannerThought(CORE_IDS, [], "no parseable plan after retries — using core set");
    return docs;
  }

  const catalogIds = [...new Set([...CORE_IDS, ...plan.catalogIds])];
  const catalogDocs = DOC_DEFINITIONS.filter((d) => catalogIds.includes(d.id));

  const customDocs = dedupeCustomDocs(plan.customDocs, catalogDocs)
    .slice(0, MAX_CUSTOM_DOCS)
    .map(buildCustomDocDefinition);

  const docs = [...catalogDocs, ...customDocs];
  options?.onResolved?.(docs);
  showPlannerThought(catalogIds, customDocs.map((d) => d.label));
  return docs;
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
  // Strip reasoning blocks some models emit before the answer, and any markdown
  // code-fence markers, so the real JSON is left standing on its own.
  const text = content
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/```(?:json)?/gi, " ")
    .trim();

  // 1. The whole thing is a JSON array.
  const direct = parseAsArray(text);
  if (direct) return direct;

  // 2. The whole thing is an object wrapping an array, e.g. { "docs": [...] }.
  const wrapped = parseObjectForArray(text);
  if (wrapped) return wrapped;

  // 3. Scan every balanced [...] span and take the first that parses. Balanced
  //    scanning avoids the greedy-match trap where stray brackets in prose (or a
  //    reasoning trace) swallow the real array and break JSON.parse.
  for (const span of balancedSpans(text, "[", "]")) {
    const parsed = parseAsArray(span);
    if (parsed) return parsed;
  }

  // 4. Last resort: a balanced object span that contains the array.
  for (const span of balancedSpans(text, "{", "}")) {
    const parsed = parseObjectForArray(span);
    if (parsed) return parsed;
  }

  return null;
}

function parseAsArray(candidate: string): unknown[] | null {
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseObjectForArray(candidate: string): unknown[] | null {
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const arr = Object.values(parsed).find((v) => Array.isArray(v));
      if (Array.isArray(arr)) return arr;
    }
  } catch {
    // Not a JSON object
  }
  return null;
}

/**
 * Yields each balanced open..close substring, respecting quoted strings so
 * brackets inside JSON string values don't throw off the depth count.
 */
function* balancedSpans(text: string, open: string, close: string): Generator<string> {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== open) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let j = i; j < text.length; j++) {
      const ch = text[j];

      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') inString = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          yield text.slice(i, j + 1);
          break;
        }
      }
    }
  }
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
