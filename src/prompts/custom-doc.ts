/**
 * Template for AI-proposed docs that don't fit any hand-tuned prompt in this folder.
 * The planner supplies a title/focus per project; this keeps the same structure and
 * grounding rules as the hand-tuned prompts instead of leaving generation unconstrained.
 */
export function buildCustomDocPrompt(title: string, focus: string): string {
  return `
Generate a Markdown document titled **${title}**.

Focus: ${focus}

Use clear Markdown headers. Use tables or Mermaid diagrams where they make relationships clearer.
Only document what is verifiable in the provided project context. A shorter, accurate document beats a padded, speculative one — omit anything you cannot point to specific evidence for.
`.trim();
}
