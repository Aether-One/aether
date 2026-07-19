export const ONBOARDING_PROMPT = `
Generate an **Onboarding** guide in Markdown, written for a HUMAN developer who will start contributing to this project. This is the human counterpart to AI_CONTEXT.md: it explains the mental model and the WHY, not just the file layout. Assume the reader has already run the project (that's the Getting Started guide's job) and now needs to understand it well enough to change it safely.

Include, using ONLY what the context supports:

1. **Why this project exists** — the problem it solves and the motivation behind it. Draw on author-written vision files (CONTEXT.md, README, CONTRIBUTING.md, ARCHITECTURE.md) for intent — but never state a planned or roadmap feature as already built.
2. **Mental model** — how to think about the project: its core concepts and how the main pieces fit together, in prose a newcomer can actually follow. Reference the architecture docs (system-overview, folder-structure) for detail instead of duplicating them.
3. **Where things live** — a short "I want to change X → look in Y" map, based on the real directory structure. Keep it to the parts a newcomer touches most.
4. **Key decisions & the reasoning** — the important architectural/design choices and WHY they were made, where the context (vision files, code, config) supports the reasoning. Explicitly flag decisions that should not be changed casually.
5. **Making your first change** — a realistic walkthrough of a typical small task in THIS codebase: which files you'd touch, and how you'd run and verify it. Ground it in the actual structure, not generic advice.
6. **Gotchas** — non-obvious things that would trip up a newcomer, or that must not be broken, if the context reveals any.

Separate intent from reality: describe something as implemented only if it is verifiable in the code. Prefer specific, project-true statements over generic onboarding boilerplate — if a sentence could apply to any project, cut it.
`.trim();
