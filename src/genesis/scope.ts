import type { ProjectContext } from "./context.js";
import { buildPrompt } from "./context.js";
import type { LLMProvider } from "../providers/types.js";
import { distillFiles, type FileContent, type DistillHooks } from "./distill.js";

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Char budget for the shared generation context. If the whole project fits under
 * this, it's sent as real code; if not, it's distilled once. Sized conservatively
 * (~12K tokens) so it fits small/free models. Override with AETHER_DOC_CONTEXT_CHARS.
 */
const DOC_CONTEXT_BUDGET = envInt("AETHER_DOC_CONTEXT_CHARS", 48_000);

export type AssembleHooks = DistillHooks;

/**
 * Builds ONE complete context that every doc is generated from — so each doc sees
 * the whole project and stays consistent with the others.
 *
 *   - whole project fits the budget → send the real code verbatim (max fidelity)
 *   - it doesn't → distill the whole project ONCE into factual notes and reuse
 *     them for every doc (nothing dropped, and the expensive pass runs a single
 *     time instead of once per doc)
 *
 * The directory tree, config files and vision docs are always kept as orientation.
 */
export async function buildSharedProjectContext(
  context: ProjectContext,
  provider: LLMProvider,
  model: string,
  hooks?: AssembleHooks,
): Promise<string> {
  const full = buildPrompt(context);
  if (full.length <= DOC_CONTEXT_BUDGET) {
    return full; // whole project fits → real code for everyone
  }

  const files = dedupe([...context.entryPoints, ...context.sourceFiles]);
  const notes = await distillFiles(files, provider, model, DOC_CONTEXT_BUDGET, hooks);
  const orientation = buildPrompt({ ...context, entryPoints: [], sourceFiles: [] });

  return (
    `${orientation}\n\n` +
    "## Distilled Source Facts\n" +
    "The project was too large to include verbatim. The notes below were extracted " +
    "directly from the source files — treat them as verified facts about the code.\n\n" +
    notes
  );
}

function dedupe(files: FileContent[]): FileContent[] {
  const seen = new Set<string>();
  const result: FileContent[] = [];
  for (const f of files) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    result.push(f);
  }
  return result;
}
