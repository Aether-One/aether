import { createHash } from "node:crypto";
import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger } from "../providers/retry.js";
import type { FileContent, DistillCache, DistillHooks } from "./types.js";
import { DISTILL_CONCURRENCY } from "./constants.js";

export type { FileContent, DistillCache, DistillHooks } from "./types.js";

const DEFAULT_PURPOSE =
  "writing complete developer documentation for this project (architecture, modules, " +
  "public API / CLI commands, domain rules, and setup/usage)";

const hashContent = (s: string): string => createHash("sha256").update(s).digest("hex");

/**
 * Distills files into factual notes, reusing a previous cache for files whose content
 * is unchanged — so /sync only pays for what actually changed. Notes replace raw code
 * in the generation prompt, so nothing is dropped; it's just compressed once per file
 * and remembered. Returns the assembled notes plus the refreshed cache to persist.
 */
export async function distillFilesIncremental(
  files: FileContent[],
  provider: LLMProvider,
  model: string,
  budget: number,
  prev: DistillCache | null,
  hooks?: DistillHooks,
): Promise<{ notes: string; cache: DistillCache }> {
  // A cache built with a different model can't be trusted — notes depend on the model.
  const reusable = prev && prev.model === model ? prev.files : {};
  const cache: DistillCache = { model, files: {} };

  const stale: FileContent[] = [];
  for (const file of files) {
    const hit = reusable[file.path];
    if (hit && hit.hash === hashContent(file.content)) {
      cache.files[file.path] = hit;
    } else {
      stale.push(file);
    }
  }

  hooks?.onStart?.(stale.length);

  // Only stale files hit the model — one call per file so each can be cached on its own.
  // Independent, so run concurrently; tune with AETHER_DISTILL_CONCURRENCY.
  let done = 0;
  await mapPool(stale, DISTILL_CONCURRENCY, async (file) => {
    const notes = await distillSingle(file, provider, model, budget);
    cache.files[file.path] = { hash: hashContent(file.content), notes };
    hooks?.onBatch?.(++done, stale.length);
  });

  const notes = files.map((f) => cache.files[f.path]?.notes).filter(Boolean).join("\n\n");
  return { notes, cache };
}

/** Distills one file, slicing it if it alone exceeds the budget. */
async function distillSingle(file: FileContent, provider: LLMProvider, model: string, budget: number): Promise<string> {
  const units: FileContent[] =
    file.content.length > budget
      ? Array.from({ length: Math.ceil(file.content.length / budget) }, (_, p) => ({
          path: `${file.path} (part ${p + 1})`,
          content: file.content.slice(p * budget, (p + 1) * budget),
        }))
      : [file];

  const parts: string[] = [];
  for (const unit of units) {
    const body = `### ${unit.path}\n\`\`\`\n${unit.content}\n\`\`\``;
    const response = await chatWithRetry(
      provider,
      { model, messages: [{ role: "user", content: `${distillInstruction(DEFAULT_PURPOSE)}\n\n${body}` }], temperature: 0 },
      { onRetry: createRetryLogger() },
    );
    parts.push(response.content.trim());
  }
  return parts.filter(Boolean).join("\n\n");
}


/**
 * Runs `fn` over items with at most `limit` in flight at once, preserving input
 * order in the result. A worker that throws propagates (chatWithRetry already
 * handles transient failures, so a throw here is terminal).
 */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Extraction contract for the summarize pass. It must stay strictly factual —
 * the whole point is to feed the doc generator condensed *evidence*, never
 * invention, so the downstream "don't hallucinate" guarantee still holds.
 */
function distillInstruction(purpose: string): string {
  return [
    `You are extracting factual notes from source files. These notes will later be used for ${purpose}.`,
    "",
    "For each file below, list concrete, verifiable facts only:",
    "- exported functions/classes/types and what they do",
    "- routes, endpoints, CLI commands, or public entry points (with their real names)",
    "- important data structures, validations, and business rules",
    "- notable dependencies or integrations actually used",
    "",
    "RULES:",
    "- Quote real identifiers exactly as they appear. Do NOT rename or generalize.",
    "- Do NOT invent, infer, or editorialize. If a file has nothing relevant, skip it.",
    "- Be compact: terse bullet points grouped by file path, no prose intro or outro.",
    "- Output ONLY the notes.",
  ].join("\n");
}

