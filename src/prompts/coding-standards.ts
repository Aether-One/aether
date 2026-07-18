export const CODING_STANDARDS_PROMPT = `
Generate a **Coding Standards** document in Markdown based on the patterns you observe in the code. Include:

1. **Code Style** — Formatting patterns (indentation, quotes, semicolons, etc.)
2. **Naming Conventions** — How files, classes, functions, variables are named
3. **Architecture Patterns** — Patterns used (Repository, Service Layer, MVC, etc.)
4. **File Organization** — How code is organized within files
5. **Import Conventions** — How imports are structured
6. **Error Handling** — How errors are handled
7. **Type Patterns** — TypeScript/typing patterns used (if applicable)
8. **Do / Don't** — Clear rules based on what you see in the code

Be prescriptive. Write rules that an AI or developer should follow when contributing to this project.
Only document patterns you can actually observe in the provided code. Do not invent conventions.
`.trim();
