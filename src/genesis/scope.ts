import type { ProjectContext } from "./context.js";
import { buildPrompt } from "./context.js";
import type { DocDefinition } from "./docs.js";
import type { LLMProvider } from "../providers/types.js";
import { distillFiles, type FileContent, type DistillHooks } from "./distill.js";

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Char budget for a single doc's generation input. If the scoped real-code
 * prompt fits under this, we send the code as-is; if not, we distill. Sized
 * conservatively (~12K tokens) so it fits small/free models. Override with
 * AETHER_DOC_CONTEXT_CHARS.
 */
const DOC_CONTEXT_BUDGET = envInt("AETHER_DOC_CONTEXT_CHARS", 48_000);

// These docs are answered by the directory tree + config files alone — pulling
// in source bodies just wastes budget, so we keep only entry points as anchors.
const MINIMAL_CODE_DOCS = new Set(["tech-stack", "folder-structure"]);

// Narrow docs: only files whose path or content matches get pulled in. Everything
// else is noise for that doc. Docs not listed here are treated as broad (whole
// project), ranked by the scan's own importance ordering.
const KEYWORD_DOCS: Record<string, { path: RegExp; content: RegExp }> = {
  api: {
    path: /route|router|controller|handler|endpoint|api|command|cli/i,
    content:
      /\b(router|route|endpoint)\b|\.(get|post|put|delete|patch)\s*\(|@(app|router|route|Get|Post|Put|Delete|Controller)\b|addCommand|\.register\w*\(|createServer|fastify|express|blueprint|@app\.route|gin\.|http\.HandleFunc/i,
  },
  business: {
    path: /service|domain|model|rule|policy|business|validat/i,
    content:
      /\bvalidat|\binvariant|\bpolicy\b|\bpermission|\brole\b|\bdiscount|\btax\b|\bprice|\bquota|\blimit\b|\brule\b|throw new \w*Error|assert\b/i,
  },
  glossary: {
    path: /domain|model|entity|type|schema|glossary/i,
    content: /\b(interface|type|enum|class|struct)\s+\w/i,
  },
  diagrams: {
    path: /service|module|controller|component|router|model|provider/i,
    content: /\b(class|interface)\s+\w+|extends\s+\w|implements\s+\w|import\s.+from/i,
  },
};

export interface AssembleHooks extends DistillHooks {}

/**
 * Builds the context string for generating a single doc. Divide-and-conquer:
 *   1. route only the files this doc actually needs (drop the rest),
 *   2. if the real code fits the budget → use it verbatim (max fidelity),
 *   3. otherwise → distill it chunk-by-chunk so nothing is lost, just compressed.
 *
 * The directory tree, config files and vision docs are always kept as cheap
 * orientation regardless of which path we take.
 */
export async function assembleDocContext(
  doc: DocDefinition,
  context: ProjectContext,
  provider: LLMProvider,
  model: string,
  hooks?: AssembleHooks,
): Promise<string> {
  const relevant = selectRelevantFiles(doc, context);

  // Scoped context: same shape as the full one, but source narrowed to this doc.
  // (entry points are folded into `relevant`, so we clear the separate list.)
  const scoped: ProjectContext = { ...context, entryPoints: [], sourceFiles: relevant };
  const scopedPrompt = buildPrompt(scoped);

  if (relevant.length === 0 || scopedPrompt.length <= DOC_CONTEXT_BUDGET) {
    return scopedPrompt; // fits (or nothing to add) → real code
  }

  // Too big for this model — compress the relevant files into factual notes.
  const notes = await distillFiles(relevant, doc, provider, model, DOC_CONTEXT_BUDGET, hooks);
  const orientation = buildPrompt({ ...context, entryPoints: [], sourceFiles: [] });

  return (
    `${orientation}\n\n` +
    "## Distilled Source Facts\n" +
    "The project was too large to include verbatim. The notes below were extracted " +
    "directly from the relevant source files — treat them as verified facts about the code.\n\n" +
    notes
  );
}

function selectRelevantFiles(doc: DocDefinition, context: ProjectContext): FileContent[] {
  const baseId = doc.id.startsWith("custom:") ? "custom" : doc.id;
  const all = dedupe([...context.entryPoints, ...context.sourceFiles]);

  if (MINIMAL_CODE_DOCS.has(baseId)) {
    return context.entryPoints; // tree + configs already answer these
  }

  const profile =
    baseId === "custom" ? buildCustomProfile(doc) : KEYWORD_DOCS[baseId] ?? null;

  if (!profile) {
    return all; // broad doc → whole project (already importance-ranked by the scan)
  }

  const matched = all.filter((f) => profile.path.test(f.path) || profile.content.test(f.content));
  // Always anchor on entry points; if nothing matched, fall back to the whole
  // project rather than starving the doc.
  const withAnchors = dedupe([...context.entryPoints, ...matched]);
  return withAnchors.length > 0 ? withAnchors : all;
}

/** Builds a keyword profile for a custom doc from its title + focus text. */
function buildCustomProfile(doc: DocDefinition): { path: RegExp; content: RegExp } {
  const tokens = `${doc.title} ${doc.summary}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));

  if (tokens.length === 0) {
    // No usable signal — match nothing so we fall back to the whole project.
    return { path: /$^/, content: /$^/ };
  }

  const alt = tokens.map(escapeRegex).join("|");
  const re = new RegExp(`\\b(${alt})`, "i");
  return { path: re, content: re };
}

const STOPWORDS = new Set([
  "this", "that", "with", "from", "what", "when", "where", "which", "into",
  "documentation", "document", "docs", "project", "specific", "about", "them",
  "their", "your", "used", "uses", "each", "the", "and", "for",
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
