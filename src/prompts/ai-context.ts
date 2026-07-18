export const AI_CONTEXT_PROMPT = `
Generate an **AI Context** file in Markdown. This file will be used as a system prompt for AI assistants working on this project. Include:

1. **Project Identity** — What this project is (1 sentence)
2. **Always Follow** — Rules the AI must always respect (architecture patterns, coding standards, naming conventions)
3. **Never Do** — Things the AI must never do (anti-patterns, things that break the project)
4. **Key Decisions** — Important architectural decisions that should not be changed without discussion
5. **Conventions** — Code conventions to maintain consistency
6. **File Patterns** — Where to put new code, how to name files

Write this as direct instructions to an AI assistant. Be prescriptive and specific.
ONLY reference actual patterns, files, and conventions from this project. Do NOT invent rules that aren't evidenced by the code.
`.trim();
