export const SYSTEM_OVERVIEW_PROMPT = `
Generate a **System Overview** document in Markdown for this project. Include:

1. **Goal** — What this project does in 1-2 sentences
2. **Architecture** — High-level architecture (Frontend/Backend/Database/Storage/Communication/Auth — only sections that apply)
3. **System Components** — List each major component and its role
4. **Communication Patterns** — How components talk to each other (REST, WebSocket, Events, etc.)
5. **Authentication & Authorization** — How auth works (only if detected)
6. **Deployment** — How it's deployed (only if detectable from configs)

Only include sections for which you have evidence in the provided context. Skip sections you cannot verify.
Format as Markdown with clear headers.
`.trim();
