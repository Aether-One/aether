import type { CleanCodeParadigm } from "../../genesis/types.js";

interface ParadigmSpec {
  label: string;
  focus: string;
  categories: string;
}

const PARADIGMS: Record<CleanCodeParadigm, ParadigmSpec> = {
  "clean-code": {
    label: "Clean Code (Robert C. Martin)",
    focus: `
- Long functions / functions doing more than one thing
- Deep nesting (pyramid of doom)
- Magic numbers or strings that should be named constants
- Poor or misleading naming (variables, functions, classes)
- Duplicated logic that should be extracted
- Large classes/files with too many responsibilities
- Dead code, commented-out code, unused variables
- Missing or misleading error handling
- Overly complex conditionals that should be simplified`.trim(),
    categories:
      "long-function | deep-nesting | magic-number | naming | duplication | dead-code | error-handling | complexity | other",
  },
  solid: {
    label: "SOLID principles",
    focus: `
- Single Responsibility: a class/module doing more than one job
- Open/Closed: code that requires modifying existing logic to extend behavior instead of extension points
- Liskov Substitution: subtypes that break the behavior expected of their base type
- Interface Segregation: fat interfaces forcing implementers to depend on methods they don't use
- Dependency Inversion: high-level code depending directly on low-level/concrete implementations instead of abstractions`.trim(),
    categories:
      "srp-violation | ocp-violation | lsp-violation | isp-violation | dip-violation | other",
  },
  functional: {
    label: "Functional / immutable style",
    focus: `
- Functions with side effects that could be pure
- Mutation of shared/external state instead of returning new values
- Classes or stateful objects used where a plain function would do
- Loops with mutable accumulators that could be map/filter/reduce
- Hidden dependencies on external/mutable state instead of explicit parameters
- Non-deterministic functions (relying on ambient state, time, randomness) without isolating that impurity`.trim(),
    categories:
      "side-effect | mutation | unnecessary-class | imperative-loop | hidden-dependency | impurity | other",
  },
  "google-style": {
    label: "Google Style Guide conventions",
    focus: `
- Naming that doesn't follow the language's Google style conventions (case, verbosity, clarity)
- Missing or inconsistent documentation comments on public APIs
- File/module structure that doesn't group related declarations sensibly
- Overly long lines, inconsistent formatting patterns that hurt scanability
- Non-idiomatic use of the language compared to Google's style guide for it
- Comments that restate the code instead of explaining intent`.trim(),
    categories:
      "naming | documentation | structure | formatting | idiom | comment-quality | other",
  },
};

export const DEFAULT_PARADIGM: CleanCodeParadigm = "clean-code";

export function paradigmLabel(paradigm: CleanCodeParadigm): string {
  return PARADIGMS[paradigm].label;
}

export function listParadigms(): Array<{
  id: CleanCodeParadigm;
  label: string;
}> {
  return (Object.keys(PARADIGMS) as CleanCodeParadigm[]).map((id) => ({
    id,
    label: PARADIGMS[id].label,
  }));
}

export function paradigmFocus(paradigm: CleanCodeParadigm): string {
  return PARADIGMS[paradigm].focus;
}

export function buildCleanCodeScanPrompt(paradigm: CleanCodeParadigm): string {
  const spec = PARADIGMS[paradigm];
  return `
You are a senior engineer reviewing this codebase strictly for violations of ${spec.label}
— not unrelated style preferences, not missing features, not architecture opinions outside
this paradigm.

Look for things like:
${spec.focus}

For each violation found, report it precisely — file path exactly as shown in the context,
and the closest line number you can determine from the code shown.

Return ONLY a JSON array. Each element is an object:
{
  "file": "path/exactly/as/shown/in/context.ts",
  "line": 42,
  "severity": "high" | "medium" | "low",
  "category": "${spec.categories}",
  "description": "what is wrong, specific to this code",
  "suggestion": "what to do instead, specific to this code"
}

Rules:
- Only report REAL issues you can point to in the code shown. Do not invent files or lines.
- Skip trivial nitpicks — focus on things that genuinely hurt readability or maintainability under ${spec.label}.
- "severity": "high" for things that actively risk bugs or make the code hard to safely change; "medium" for real but contained issues; "low" for minor polish.
- If the code shown already follows ${spec.label}, return [].
- Respond with ONLY the JSON array, no prose, no markdown code fences.
`.trim();
}
