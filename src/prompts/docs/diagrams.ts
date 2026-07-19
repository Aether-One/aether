export const DIAGRAMS_PROMPT = `
Generate **System Diagrams** using Mermaid syntax in Markdown. Create:

1. **Component Diagram** — How modules/components relate to each other
2. **Data Flow Diagram** — How data moves through the system
3. **Sequence Diagram** — Key flows (e.g., main user action, request lifecycle)

Use Mermaid \`\`\`mermaid blocks. Make the diagrams specific to THIS project using actual module/file names.
Keep diagrams readable (not too many nodes). Focus on the most important relationships.

ONLY include components, modules, and connections that are verifiable from the code you can see.
Do NOT add components or flows that don't exist. If a relationship is unclear, omit it.
`.trim();
