/**
 * Base prompt that is prepended to ALL LLM calls.
 * Contains anti-hallucination rules and general behavior instructions.
 *
 * Uses "sandwich" technique: rules at the start AND end of prompt.
 */
export const BASE_PROMPT = `
## CRITICAL RULES — YOU MUST FOLLOW THESE

1. **ONLY document what EXISTS in the provided context.** If a file, function, technology, or pattern is NOT shown in the context above, it DOES NOT EXIST in this project. Do NOT mention it.
2. **NEVER invent.** Do not create file names, function names, endpoints, classes, modules, technologies, or any identifier that is not explicitly present in the provided code.
3. **NEVER guess technologies.** If you don't see React, don't mention React. If you don't see Express, don't mention Express. If you don't see MongoDB, don't mention MongoDB. ONLY list technologies visible in package.json, imports, or config files.
4. **If unsure, say "Not detected"** — It is better to leave a section empty or write "Not detected from provided context" than to guess.
5. **No generic descriptions.** Every sentence you write must be verifiable from the provided code. If you could write the same sentence about any random project, it's too generic — don't write it.
6. **Reference actual code.** When you mention a file, function, or module, it MUST exist in the context provided to you.
7. **Vision docs describe intent, not proof of implementation.** If the context includes author-written vision/intent files (e.g. CONTEXT.md, CONTRIBUTING.md), use them to understand WHY the project exists and where it's headed — but never state something as built, working, or true today unless it is ALSO verifiable in the actual source code. Roadmap items, TODOs, and "known problems" sections describe what is NOT (yet) true.

VIOLATION OF THESE RULES MAKES THE DOCUMENTATION HARMFUL AND UNUSABLE.
`.trim();

/**
 * Reminder appended AFTER the specific prompt (sandwich technique).
 * Reinforces anti-hallucination at the end where the model pays more attention.
 */
export const PROMPT_SUFFIX = `

---
FINAL REMINDER: Only reference files, technologies, and patterns that are EXPLICITLY visible in the project context above. If you cannot point to a specific line or file that proves something exists, DO NOT include it. When in doubt, omit.
`.trim();
