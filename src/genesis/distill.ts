import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger } from "../providers/retry.js";
import type { FileContent, DistillCache, DistillHooks } from "./types.js";
import { DISTILL_CONCURRENCY } from "./constants.js";
import { hashContent } from "../util/hash.js";

export type { FileContent, DistillCache, DistillHooks } from "./types.js";

const DEFAULT_PURPOSE =
  "writing complete developer documentation for this project (architecture, modules, " +
  "public API / CLI commands, domain rules, and setup/usage)";

/**
 * Distills files into factual notes, grouped into budget-sized chunks so a large project
 * takes a handful of calls — not one per file. Each chunk is cached by a hash of its
 * contents, so /sync only re-distills the chunks whose files changed; everything else is
 * reused. Returns the assembled notes plus the refreshed cache to persist.
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
  const reusable = prev && prev.model === model ? prev.chunks : {};
  const cache: DistillCache = { model, chunks: {} };

  const chunkBudget = Math.max(4_000, Math.floor(budget * 0.75));
  const ordered = chunkFiles(files, chunkBudget).map((chunk) => ({ chunk, hash: chunkHash(chunk) }));

  // Reuse cached chunks up front; only the rest hit the model.
  const stale = ordered.filter(({ hash }) => {
    if (reusable[hash] !== undefined) {
      cache.chunks[hash] = reusable[hash];
      return false;
    }
    return true;
  });

  if (stale.length > 0) hooks?.onStart?.(stale.length);

  // Chunks are independent — run several concurrently. Tune with AETHER_DISTILL_CONCURRENCY.
  let done = 0;
  await mapPool(stale, DISTILL_CONCURRENCY, async ({ chunk, hash }) => {
    cache.chunks[hash] = await distillChunk(chunk, provider, model);
    hooks?.onBatch?.(++done, stale.length);
  });

  const notes = ordered.map(({ hash }) => cache.chunks[hash]).filter(Boolean).join("\n\n");
  return { notes, cache };
}

/** sha256 of a chunk's files (path + content, LF-normalized) — the cache key for that chunk. */
function chunkHash(chunk: FileContent[]): string {
  return hashContent(chunk.map((f) => `${f.path}\n${f.content}`).join("\n"));
}

/** Distills one chunk of files into factual notes in a single model call. */
async function distillChunk(chunk: FileContent[], provider: LLMProvider, model: string): Promise<string> {
  const body = chunk.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n");
  const response = await chatWithRetry(
    provider,
    { model, messages: [{ role: "user", content: `${distillInstruction(DEFAULT_PURPOSE)}\n\n${body}` }], temperature: 0 },
    { onRetry: createRetryLogger() },
  );
  return response.content.trim();
}

/**
 * Packs files into chunks that each stay under `budget` characters. Small files are
 * grouped together; a file larger than the budget is sliced so even one huge file fits.
 */
function chunkFiles(files: FileContent[], budget: number): FileContent[][] {
  const chunks: FileContent[][] = [];
  let current: FileContent[] = [];
  let currentLen = 0;

  const flush = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
  };

  for (const file of files) {
    if (file.content.length > budget) {
      flush();
      const parts = Math.ceil(file.content.length / budget);
      for (let p = 0; p < parts; p++) {
        chunks.push([
          { path: `${file.path} (part ${p + 1}/${parts})`, content: file.content.slice(p * budget, (p + 1) * budget) },
        ]);
      }
      continue;
    }
    if (currentLen + file.content.length > budget) flush();
    current.push(file);
    currentLen += file.content.length;
  }

  flush();
  return chunks;
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

