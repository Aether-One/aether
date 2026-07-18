import type { LLMProvider } from "../providers/types.js";
import { chatWithRetry, createRetryLogger } from "../providers/retry.js";

export interface FileContent {
  path: string;
  content: string;
}

const DEFAULT_PURPOSE =
  "writing complete developer documentation for this project (architecture, modules, " +
  "public API / CLI commands, domain rules, and setup/usage)";

export interface DistillHooks {
  /** Called once we know how many summarize calls this doc needs. */
  onStart?: (batches: number) => void;
  /** Called before each summarize call (1-indexed). */
  onBatch?: (index: number, total: number) => void;
}

/**
 * Divide-and-conquer for a doc whose relevant code doesn't fit the budget:
 * chunk the files → summarize each chunk into factual notes → concatenate.
 * The notes replace raw code in the final generation prompt, so nothing is
 * dropped (unlike a hard budget cut) — it's just compressed, one chunk at a time.
 *
 * Slower on weak models (N extra calls), but that's the accepted trade for
 * covering a project that would otherwise overflow the context window.
 */
export async function distillFiles(
  files: FileContent[],
  provider: LLMProvider,
  model: string,
  budget: number,
  hooks?: DistillHooks,
  purpose: string = DEFAULT_PURPOSE,
): Promise<string> {
  // Leave headroom in each chunk for the instruction wrapper.
  const chunkBudget = Math.max(4_000, Math.floor(budget * 0.75));
  const chunks = chunkFiles(files, chunkBudget);

  hooks?.onStart?.(chunks.length);

  const notes: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    hooks?.onBatch?.(i + 1, chunks.length);

    const body = chunks[i]
      .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    const response = await chatWithRetry(
      provider,
      {
        model,
        messages: [{ role: "user", content: `${distillInstruction(purpose)}\n\n${body}` }],
        temperature: 0,
      },
      { onRetry: createRetryLogger() },
    );

    const note = response.content.trim();
    if (note) notes.push(note);
  }

  return notes.join("\n\n");
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

/**
 * Packs files into chunks that each stay under `budget` characters. Small files
 * are grouped together; a single file larger than the budget is sliced into
 * budget-sized parts so even one huge file never overflows a chunk.
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
        const slice = file.content.slice(p * budget, (p + 1) * budget);
        chunks.push([{ path: `${file.path} (part ${p + 1}/${parts})`, content: slice }]);
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
