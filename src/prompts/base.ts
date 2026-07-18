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

/**
 * Base prompt for HUMAN-facing guides (getting-started, onboarding, contributing).
 *
 * The machine contract above (BASE_PROMPT) keeps AI docs accurate by demanding every
 * sentence map to a file — which also makes them read like a file index. Human docs
 * need the SAME anti-hallucination floor (never invent tech/files, never call a planned
 * feature "built") but the OPPOSITE writing contract: explain, connect, lead with WHY,
 * and treat the author-written vision files as the primary source for intent.
 */
export const HUMAN_BASE_PROMPT = `
## HOW TO WRITE THIS DOCUMENT — READ CAREFULLY

You are writing for a HUMAN developer, not for a machine index. Your job is to make the project understandable to someone who has never seen the code: explain purpose, connect the pieces, and lead with the WHY. Prefer flowing prose that builds a mental model over lists of files.

ACCURACY FLOOR — these still hold (getting a fact wrong is worse than leaving it out):
1. **Never invent technologies, files, commands, or identifiers.** If React, a script, or a file is not in the provided context, do not mention it.
2. **Never present a plan as reality.** Roadmap items, TODOs, and "coming soon" features from the vision files are NOT implemented — describe them as planned. Only call something implemented if it is verifiable in the actual code.

WRITING CONTRACT — this OVERRIDES the machine-doc style you may know:
3. **Explain, don't catalogue.** Do NOT produce a file index or a path-to-description table. Name a file only when it helps the reader DO something ("your change goes in X"). Otherwise write paragraphs that explain how things relate and WHY they're arranged that way.
4. **The vision files are your PRIMARY source for intent.** Author-written docs (CONTEXT.md, README, CONTRIBUTING.md, ARCHITECTURE.md) are where purpose, motivation, and design reasoning live — draw on them freely for the "why". You do NOT need a file citation to explain intent or how to think about the project; you only need code evidence before stating something is *implemented*.
5. **Explanatory framing is encouraged; empty filler is not.** You MAY use analogy, plain-language framing, and "the point of this is…" sentences to make the project click. You may NOT pad with generic boilerplate that says nothing specific about THIS project ("uses modern best practices", "is highly scalable").
6. **Lead with the reader's goal.** Organize around what a person wants to do — run it, understand it, change it safely — not around the directory tree.
`.trim();

/**
 * Suffix for human-facing guides. Mirrors PROMPT_SUFFIX's sandwich role but reinforces
 * the human contract instead of the "omit anything you can't cite a file for" rule.
 */
export const HUMAN_PROMPT_SUFFIX = `

---
FINAL REMINDER: You are explaining this project to a person who needs to understand and change it. Keep every technology, file, and command real and accurate — but your goal is to EXPLAIN and CONNECT, not to list. Lead with the why, lean on the vision files for intent, and never present a planned feature as already built.
`.trim();
