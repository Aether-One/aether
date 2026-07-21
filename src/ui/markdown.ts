import chalk from "chalk";
import { ACCENT, ACCENT_BOLD, DIM } from "./theme.js";

const CODE = chalk.cyan;
const RULE_WIDTH = 44;

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, (_, c) => CODE(c))
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => chalk.bold(b));
}

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let inFence = false;

  for (const raw of md.split("\n")) {
    const fence = raw.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      out.push(inFence ? DIM("└─") : DIM(fence[1] ? `┌─ ${fence[1]}` : "┌─"));
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(`${DIM("│")} ${chalk.gray(raw)}`);
      continue;
    }

    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const text = renderInline(heading[2]);
      out.push("", heading[1].length <= 2 ? ACCENT_BOLD(text.toUpperCase()) : ACCENT(text));
      continue;
    }

    if (/^\s*---+\s*$/.test(raw)) {
      out.push(DIM("─".repeat(RULE_WIDTH)));
      continue;
    }

    const bullet = raw.match(/^(\s*)[-*]\s+(.*)$/);
    if (bullet) {
      out.push(`${bullet[1]}${ACCENT("•")} ${renderInline(bullet[2])}`);
      continue;
    }

    const numbered = raw.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numbered) {
      out.push(`${numbered[1]}${ACCENT(`${numbered[2]}.`)} ${renderInline(numbered[3])}`);
      continue;
    }

    out.push(renderInline(raw));
  }

  return out.join("\n");
}
