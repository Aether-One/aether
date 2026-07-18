import type { ProjectContext } from "./context.js";

/**
 * A compact, deterministic map of the project for the *planner* — zero LLM calls.
 * The planner only decides WHICH docs to generate, so it needs signals ("are there
 * routes? domain logic? multiple modules?") and a signature index, not raw code.
 * This keeps the planning prompt small enough to run on slow/free models.
 */
export function buildPlannerDigest(context: ProjectContext): string {
  const parts: string[] = [];

  parts.push("# PROJECT MAP (for planning which docs to generate)");
  parts.push("");
  parts.push(`Project name: ${context.name}`);
  if (context.description) parts.push(`Description: ${context.description}`);
  parts.push("");
  parts.push(
    "This is a compact map of the project: its structure, config files, detected " +
      "capabilities, and the public symbols of each source file. Base every decision " +
      "only on what appears here.",
  );
  parts.push("");

  parts.push("## Directory Structure");
  parts.push("```");
  parts.push(context.directoryTree);
  parts.push("```");
  parts.push("");

  if (context.configFiles.length > 0) {
    parts.push("## Configuration Files (truncated)");
    for (const file of context.configFiles) {
      parts.push(`### ${file.path}`);
      parts.push("```");
      parts.push(file.content.length > CONFIG_CAP ? file.content.slice(0, CONFIG_CAP) + "\n… (truncated)" : file.content);
      parts.push("```");
      parts.push("");
    }
  }

  parts.push("## Detected Signals");
  for (const line of detectSignals(context)) parts.push(`- ${line}`);
  parts.push("");

  const sourceFiles = [...context.entryPoints, ...context.sourceFiles];
  if (sourceFiles.length > 0) {
    parts.push("## Source Files & Public Symbols");
    for (const file of sourceFiles) {
      const symbols = extractSymbols(file.content);
      parts.push(`- \`${file.path}\`${symbols.length ? ` — ${symbols.join(", ")}` : ""}`);
    }
    parts.push("");
  }

  if (context.omittedFiles.length > 0) {
    parts.push("## Omitted (too large)");
    for (const note of context.omittedFiles) parts.push(`- ${note}`);
    parts.push("");
  }

  return parts.join("\n");
}

const CONFIG_CAP = 4_000;
const MAX_SYMBOLS_PER_FILE = 14;

// Deterministic capability flags that feed the planner's conditional-doc decisions.
const ROUTE_RE =
  /\b(router|route|endpoint)\b|\.(get|post|put|delete|patch)\s*\(|@(app|router|route|Get|Post|Put|Delete|Controller)\b|addCommand|\.register\w*\(|createServer|fastify|express|blueprint|gin\.|http\.HandleFunc/i;
const DOMAIN_RE =
  /\bvalidat|\binvariant|\bpolicy\b|\bpermission|\brole\b|\bdiscount|\btax\b|\bprice|\bquota|\brule\b|throw new \w*Error|assert\b/i;
const TEST_RE = /\.(test|spec)\.|(^|[\\/])(__tests__|tests?)[\\/]/i;

function detectSignals(context: ProjectContext): string[] {
  const src = [...context.entryPoints, ...context.sourceFiles];
  const routes = src.filter((f) => ROUTE_RE.test(f.content)).length;
  const domain = src.filter((f) => DOMAIN_RE.test(f.content)).length;
  const tests = src.filter((f) => TEST_RE.test(f.path)).length;

  const topDirs = new Set(
    context.sourceFiles
      .map((f) => f.path.replace(/^\.\//, "").split(/[\\/]/))
      .filter((seg) => seg.length > 1)
      .map((seg) => seg[0]),
  );

  return [
    `Source files: ${src.length}`,
    `Top-level modules: ${topDirs.size} (${[...topDirs].slice(0, 12).join(", ")})`,
    `Files with route/endpoint/CLI-command patterns: ${routes}`,
    `Files with domain/validation/business logic: ${domain}`,
    `Test files: ${tests}`,
    `Config files present: ${context.configFiles.map((f) => f.path).join(", ") || "none"}`,
  ];
}

const SYMBOL_RE =
  /^\s*(?:export\s+)?(?:default\s+)?(?:public\s+|pub\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const|struct|func|def)\s+([A-Za-z_$][\w$]*)/gm;

/** Pulls top-level declared names from a source file (language-agnostic best effort). */
function extractSymbols(content: string): string[] {
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  SYMBOL_RE.lastIndex = 0;
  while ((match = SYMBOL_RE.exec(content)) !== null) {
    names.add(match[1]);
    if (names.size >= MAX_SYMBOLS_PER_FILE) break;
  }
  return [...names];
}
