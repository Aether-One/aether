export const TECH_STACK_PROMPT = `
Generate a **Tech Stack** document in Markdown. Include:

1. **Languages** — Programming languages used and why
2. **Frameworks** — Frameworks/libraries and their purpose
3. **Build Tools** — Bundlers, compilers, task runners
4. **Testing** — Test frameworks and tools (only if detected)
5. **Development Tools** — Linters, formatters, dev utilities (only if detected)
6. **Infrastructure** — Docker, CI/CD, deployment tools (only if present in configs)
7. **Key Dependencies** — Most important dependencies and why they're used

Format as a table or list. For each technology, explain WHY it's used in this project.
Only list technologies that you can verify from package.json, config files, or import statements in the code.
`.trim();
