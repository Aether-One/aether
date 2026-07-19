export const GLOSSARY_PROMPT = `
Generate a **Glossary** document in Markdown. List all domain-specific terms, technical terms, and project-specific concepts used in this codebase.

Format as:

| Term | Definition |
|------|-----------|
| ... | ... |

Include:
- Domain entities (from types, models, interfaces)
- Technical concepts specific to this project
- Abbreviations and acronyms used in the code
- Module/component names and what they represent

Be concise. 1-2 sentences per term.
ONLY include terms that actually appear in the code. Do NOT invent domain terms.
`.trim();
