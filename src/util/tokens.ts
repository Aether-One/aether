// ~4 chars/token heuristic — enough to size prompts, not billing-grade.
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
