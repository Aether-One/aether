export const MODULES_PROMPT = `
Generate a **Modules Overview** document in Markdown. For EACH major module/directory in the source code, document:

1. **Purpose** — What it does (1-2 sentences)
2. **Key Files** — Important files in the module and their roles
3. **Exports** — Main things this module exposes
4. **Dependencies** — What other modules it depends on
5. **Flow** — How data flows through it

Format each module as its own section. Include a dependency map showing how modules relate to each other.
Use Mermaid diagrams if the relationships are complex.

Only document modules that exist in the provided directory structure. Only reference files you can see in the context.
`.trim();
