import type { Key } from "node:readline";
import chalk from "chalk";
import { TextPrompt, isCancel } from "@clack/core";
import { registry } from "../commands/registry.js";

import { ACCENT, ACCENT_BOLD, DIM } from "./theme.js";

const TIPS = [
  `${DIM("tip:")} use ${ACCENT("/genesis")} to analyze your project`,
  `${DIM("tip:")} ${ACCENT("Tab")} to autocomplete commands`,
  `${DIM("tip:")} ${ACCENT("/clear")} clears the screen`,
  `${DIM("tip:")} just type a message to chat`,
];

const MAX_DROPDOWN = 6;

let tipIndex = 0;
let messageCount = 0;

export async function startChat(): Promise<void> {
  for (;;) {
    if (messageCount > 0 && messageCount % 4 === 0) {
      process.stdout.write(`  ${TIPS[tipIndex % TIPS.length]}\n\n`);
      tipIndex++;
    }

    const input = await ask();

    // Ctrl+C — leave the same way the old readline "close" handler did.
    if (isCancel(input)) {
      process.stdout.write(`\n${DIM("  ✦ See you next time.")}\n\n`);
      process.exit(0);
    }

    messageCount++;
    const trimmed = input.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("/")) {
      const handled = await registry.execute(trimmed);
      if (handled) continue;
    }

    respond(trimmed.startsWith("/") ? trimmed.slice(1) : trimmed);
  }
}

/** Prompt for one line. Resolves to the typed string, or a cancel symbol on Ctrl+C. */
function ask(): Promise<string | symbol> {
  const prompt = new ChatPrompt();
  return prompt.prompt() as Promise<string | symbol>;
}

/**
 * A single-line text prompt with a live dropdown of matching `/` commands and
 * Tab completion. Rendering is delegated to @clack/core's TextPrompt.
 */
class ChatPrompt extends TextPrompt {
  constructor() {
    super({
      render(this: TextPrompt) {
        return renderFrame(this);
      },
    });

    // readline inserts a literal tab into the buffer; intercept it for completion.
    this.on("key", (_char: string | undefined, key: Key) => {
      if (key?.name === "tab") this.handleTab();
    });
  }

  private handleTab(): void {
    const raw = this.userInput.replace(/\t/g, "");
    const completed = completeSlash(raw);
    const next = completed ?? raw;
    // Rewrite the buffer (strips the stray tab even when there's nothing to complete).
    if (next !== this.userInput) {
      this._clearUserInput();
      this._setUserInput(next, true);
    }
  }
}

export function renderFrame(p: Pick<TextPrompt, "userInput" | "userInputWithCursor" | "state">): string {
  const line = `${ACCENT_BOLD("  → ")}${p.userInputWithCursor}`;
  // Only show the dropdown while the user is actively editing.
  if (p.state === "submit" || p.state === "cancel") return line;
  return `${line}${buildDropdown(p.userInput)}`;
}

/** The dropdown block (leading newlines put it below the input line), or "" when hidden. */
export function buildDropdown(line: string): string {
  if (!line.startsWith("/")) return "";

  const partial = line.slice(1).toLowerCase();
  const commands = registry.getAll();
  const matches = partial.length === 0 ? commands : commands.filter((c) => c.name.startsWith(partial));

  // Hide once there's nothing useful left to suggest.
  if (matches.length === 0) return "";
  if (matches.length === 1 && matches[0].name === partial) return "";

  const lines: string[] = [];
  for (const cmd of matches.slice(0, MAX_DROPDOWN)) {
    lines.push(`  ${ACCENT(`/${cmd.name}`.padEnd(14))} ${DIM(cmd.description)}`);
  }
  if (matches.length > MAX_DROPDOWN) {
    lines.push(DIM(`  (+${matches.length - MAX_DROPDOWN} more)`));
  }
  lines.push(DIM("  ↹ tab to complete"));

  return `\n${lines.join("\n")}`;
}

/**
 * Completion for a partial `/command`. Returns the completed input, or null if
 * there's nothing to complete. One match → full name + trailing space; several
 * → the longest common prefix (mirrors readline).
 */
export function completeSlash(input: string): string | null {
  if (!input.startsWith("/")) return null;

  const partial = input.slice(1).toLowerCase();
  const names = registry
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith(partial));

  if (names.length === 0) return null;
  if (names.length === 1) return `/${names[0]} `;

  const prefix = commonPrefix(names);
  return prefix.length > partial.length ? `/${prefix}` : null;
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

function respond(message: string): void {
  const lower = message.toLowerCase();

  process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether")}\n\n`);

  if (lower.match(/help|ajuda|comando/)) {
    process.stdout.write(chalk.white("     I can help you understand and document your codebase.\n"));
    process.stdout.write(chalk.white("     Here are some things you can do:\n\n"));
    process.stdout.write(`     ${ACCENT("/genesis")}  — Analyze and document your project\n`);
    process.stdout.write(`     ${ACCENT("/help")}     — See all commands\n\n`);
    process.stdout.write(DIM("     Or just ask me anything about your code.\n"));
  } else if (lower.match(/hello|oi|hey|ola/)) {
    process.stdout.write(chalk.white("     Hey! 👋 I'm Aether.\n"));
    process.stdout.write(chalk.white("     I analyze, document, and explain codebases.\n"));
    process.stdout.write(chalk.white("     Ready when you are — try /genesis to start.\n"));
  } else if (lower.match(/genesis|analisa|documenta/)) {
    process.stdout.write(chalk.white("     To analyze your project, run:\n\n"));
    process.stdout.write(`     ${ACCENT("/genesis")}\n\n`);
    process.stdout.write(DIM("     I'll scan your code, detect patterns, and generate docs.\n"));
  } else {
    process.stdout.write(chalk.white("     I'm not connected to an AI model yet.\n"));
    process.stdout.write(chalk.white("     Once connected, I'll answer questions about your code.\n\n"));
    process.stdout.write(DIM("     For now, try /genesis to analyze your project.\n"));
  }

  process.stdout.write("\n");
}
