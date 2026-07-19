export const FOLDER_STRUCTURE_PROMPT = `
Generate a **Folder Structure** document in Markdown. Include:

1. **Overview** — Brief description of the project layout philosophy
2. **Root Structure** — What each top-level directory does
3. **Source Structure** — Detailed breakdown of the src/ directory (or main source dir)
4. **Naming Conventions** — File/folder naming patterns used
5. **Key Files** — Important files and what they do (entry points, configs, etc.)

Use a tree diagram format where appropriate. Only reference directories and files that exist in the provided context.
`.trim();
