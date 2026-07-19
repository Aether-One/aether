import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ProjectContext } from "./context.js";
import { buildPrompt } from "./context.js";
import type { LLMProvider } from "../providers/types.js";
import { getProjectCacheDir } from "../config/index.js";
import { DOC_CONTEXT_BUDGET } from "./constants.js";
import { distillFilesIncremental, type FileContent, type DistillHooks, type DistillCache } from "./distill.js";

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
  const prev = await loadDistillCache(context.rootDir);
  const { notes, cache } = await distillFilesIncremental(files, provider, model, DOC_CONTEXT_BUDGET, prev, hooks);
  await saveDistillCache(context.rootDir, cache);

  const orientation = buildPrompt({ ...context, entryPoints: [], sourceFiles: [] });

  return (
    `${orientation}\n\n` +
    "## Distilled Source Facts\n" +
    "The project was too large to include verbatim. The notes below were extracted " +
    "directly from the source files — treat them as verified facts about the code.\n\n" +
    notes
  );
}

function distillCachePath(rootDir: string): string {
  return join(getProjectCacheDir(rootDir), "distill-cache.json");
}

async function loadDistillCache(rootDir: string): Promise<DistillCache | null> {
  const path = distillCachePath(rootDir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8"));
    return parsed?.files && typeof parsed.files === "object" ? (parsed as DistillCache) : null;
  } catch {
    return null;
  }
}

async function saveDistillCache(rootDir: string, cache: DistillCache): Promise<void> {
  try {
    await mkdir(getProjectCacheDir(rootDir), { recursive: true });
    await writeFile(distillCachePath(rootDir), JSON.stringify(cache), "utf-8");
  } catch {
    /* best-effort: a missing cache just means the next run re-distills */
  }
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
