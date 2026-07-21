import type { FileContent, CleanCodeIssue, CleanCodeParadigm } from "./types.js";

// Deliberately approximate — regex/line-based signal, not an AST-precision linter.
// Good enough to seed clean.md; false positives/negatives are expected and noted there.

const LONG_FUNCTION_LINES = 40;
const DEEP_NESTING_LEVELS = 4;
const INDENT_WIDTH = 2;
const GENERIC_NAMES = new Set(["data", "temp", "tmp", "foo", "bar", "baz", "val", "obj", "thing", "stuff", "x1", "x2"]);

const FUNCTION_START_RE = /^\s*(export\s+)?(default\s+)?(async\s+)?function\s+\w+|^\s*(public|private|protected|static|async)*\s*\w+\s*\([^)]*\)\s*(:\s*[\w<>\[\].,\s|]+)?\s*\{$|=>\s*\{$/;

function lineIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  const spaces = match ? match[1].replace(/\t/g, "  ").length : 0;
  return Math.floor(spaces / INDENT_WIDTH);
}

export function detectLongFunctions(file: FileContent): CleanCodeIssue[] {
  const lines = file.content.split("\n");
  const issues: CleanCodeIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!FUNCTION_START_RE.test(lines[i])) continue;

    const startIndent = lineIndentLevel(lines[i]);
    let depth = 0;
    let opened = false;
    let end = i;

    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") {
          depth++;
          opened = true;
        } else if (ch === "}") {
          depth--;
        }
      }
      if (opened && depth <= 0) {
        end = j;
        break;
      }
    }

    const length = end - i + 1;
    if (length > LONG_FUNCTION_LINES) {
      issues.push({
        file: file.path,
        line: i + 1,
        severity: length > LONG_FUNCTION_LINES * 2 ? "high" : "medium",
        category: "long-function",
        description: `Function spans ~${length} lines, starting at indent level ${startIndent}.`,
        suggestion: "Extract cohesive chunks of this function into smaller, named helper functions.",
      });
    }

    i = end; // skip past this function's body
  }

  return issues;
}

export function detectDeepNesting(file: FileContent): CleanCodeIssue[] {
  const lines = file.content.split("\n");
  const issues: CleanCodeIssue[] = [];
  let lastFlaggedLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    const level = lineIndentLevel(lines[i]);
    if (level > DEEP_NESTING_LEVELS && level > lastFlaggedLevel) {
      issues.push({
        file: file.path,
        line: i + 1,
        severity: level > DEEP_NESTING_LEVELS + 2 ? "high" : "medium",
        category: "deep-nesting",
        description: `Code nested ${level} levels deep.`,
        suggestion: "Extract inner blocks into a function, or invert conditions with early returns/guard clauses.",
      });
      lastFlaggedLevel = level;
    } else if (level <= DEEP_NESTING_LEVELS) {
      lastFlaggedLevel = 0;
    }
  }

  return issues;
}

const NUMBER_RE = /(?<![\w.])-?\d+(\.\d+)?(?![\w.])/g;
const ALLOWED_NUMBERS = new Set(["0", "1", "-1", "2", "100"]);

export function detectMagicNumbers(file: FileContent): CleanCodeIssue[] {
  const lines = file.content.split("\n");
  const issues: CleanCodeIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    // Skip declarations that are already named constants.
    if (/^(export\s+)?const\s+[A-Z0-9_]+\s*=/.test(trimmed)) continue;
    // Skip import/array-index-only lines to cut obvious noise.
    if (/^import\b/.test(trimmed)) continue;

    const matches = trimmed.matchAll(NUMBER_RE);
    for (const m of matches) {
      if (ALLOWED_NUMBERS.has(m[0])) continue;
      issues.push({
        file: file.path,
        line: i + 1,
        severity: "low",
        category: "magic-number",
        description: `Literal ${m[0]} used inline instead of a named constant.`,
        suggestion: `Extract ${m[0]} into a named UPPER_CASE constant describing what it represents.`,
      });
      break; // one flag per line is enough signal
    }
  }

  return issues;
}

const COMMENTED_CODE_RE = /^\/\/\s*(const|let|var|function|if|for|while|return|import|export|class)\b/;

export function detectDeadCode(file: FileContent): CleanCodeIssue[] {
  const lines = file.content.split("\n");
  const issues: CleanCodeIssue[] = [];
  let runStart = -1;

  for (let i = 0; i <= lines.length; i++) {
    const trimmed = (lines[i] ?? "").trim();
    const looksLikeCode = COMMENTED_CODE_RE.test(trimmed);

    if (looksLikeCode && runStart === -1) {
      runStart = i;
    } else if (!looksLikeCode && runStart !== -1) {
      issues.push({
        file: file.path,
        line: runStart + 1,
        severity: "low",
        category: "dead-code",
        description: `Commented-out code block (${i - runStart} line${i - runStart === 1 ? "" : "s"}).`,
        suggestion: "Delete it — version control already preserves history.",
      });
      runStart = -1;
    }
  }

  return issues;
}

const IDENTIFIER_DECL_RE = /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/g;
const LOOP_VAR_ALLOWLIST = new Set(["i", "j", "k", "_"]);

export function detectPoorNaming(file: FileContent): CleanCodeIssue[] {
  const lines = file.content.split("\n");
  const issues: CleanCodeIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    for (const m of trimmed.matchAll(IDENTIFIER_DECL_RE)) {
      const name = m[1];
      if (LOOP_VAR_ALLOWLIST.has(name)) continue;

      if (name.length <= 2 && !/^[ijk]\d?$/.test(name)) {
        issues.push({
          file: file.path,
          line: i + 1,
          severity: "low",
          category: "naming",
          description: `Variable "${name}" has an unclear, overly short name.`,
          suggestion: "Rename it to describe what the value represents.",
        });
      } else if (GENERIC_NAMES.has(name.toLowerCase())) {
        issues.push({
          file: file.path,
          line: i + 1,
          severity: "low",
          category: "naming",
          description: `Variable "${name}" has a generic, non-descriptive name.`,
          suggestion: "Rename it to describe its actual content or purpose.",
        });
      }
    }
  }

  return issues;
}

type Detector = (file: FileContent) => CleanCodeIssue[];

const DETECTORS_BY_PARADIGM: Record<CleanCodeParadigm, Detector[]> = {
  "clean-code": [detectLongFunctions, detectDeepNesting, detectMagicNumbers, detectDeadCode, detectPoorNaming],
  solid: [detectLongFunctions, detectDeepNesting],
  functional: [detectDeepNesting, detectDeadCode],
  "google-style": [detectMagicNumbers, detectPoorNaming, detectDeadCode],
};

export function runHeuristics(files: FileContent[], paradigm: CleanCodeParadigm): CleanCodeIssue[] {
  const detectors = DETECTORS_BY_PARADIGM[paradigm];
  const issues: CleanCodeIssue[] = [];
  for (const file of files) {
    for (const detect of detectors) {
      issues.push(...detect(file));
    }
  }
  return issues;
}
