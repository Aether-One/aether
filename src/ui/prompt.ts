import * as readline from "node:readline";
import chalk from "chalk";
import { registry, type Command } from "../commands/registry.js";

import { ACCENT, ACCENT_BOLD, DIM } from "./theme.js";

const TIPS = [
  `${DIM("tip:")} use ${ACCENT("/genesis")} to analyze your project`,
  `${DIM("tip:")} ${ACCENT("Tab")} to autocomplete commands`,
  `${DIM("tip:")} ${ACCENT("/clear")} clears the screen`,
  `${DIM("tip:")} just type a message to chat`,
];

let tipIndex = 0;
let messageCount = 0;
let dropdownVisible = false;
let dropdownLines = 0;

export function startChat(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer,
  });

  promptUser(rl);

  rl.on("close", () => {
    clearDropdown();
    process.stdout.write(`\n${DIM("  ✦ See you next time.")}\n\n`);
    process.exit(0);
  });

  // Show dropdown as user types
  rl.on("line", () => { /* handled in question callback */ });

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin, rl);
  }

  process.stdin.on("keypress", () => {
    setImmediate(() => {
      const line = (rl as unknown as { line: string }).line ?? "";
      showDropdown(line);
    });
  });
}

function showDropdown(line: string): void {
  clearDropdown();

  if (!line.startsWith("/") || line.length < 1) return;

  const partial = line.slice(1).toLowerCase();
  const commands = registry.getAll();
  const matches = partial.length === 0
    ? commands
    : commands.filter((c) => c.name.startsWith(partial));

  if (matches.length === 0 || (matches.length === 1 && matches[0].name === partial)) return;

  // Print dropdown below cursor
  process.stdout.write("\x1B[s"); // save cursor
  process.stdout.write("\n");

  const maxShow = 6;
  const toShow = matches.slice(0, maxShow);

  for (const cmd of toShow) {
    process.stdout.write(`  ${ACCENT(`/${cmd.name}`.padEnd(14))} ${DIM(cmd.description)}\n`);
  }

  if (matches.length > maxShow) {
    process.stdout.write(DIM(`  (+${matches.length - maxShow} more)\n`));
    dropdownLines = toShow.length + 2;
  } else {
    dropdownLines = toShow.length + 1;
  }

  process.stdout.write(DIM("  ↹ tab to complete\n"));
  dropdownLines++;

  dropdownVisible = true;
  process.stdout.write("\x1B[u"); // restore cursor
}

function clearDropdown(): void {
  if (!dropdownVisible) return;

  process.stdout.write("\x1B[s");
  for (let i = 0; i < dropdownLines; i++) {
    process.stdout.write("\n\x1B[2K");
  }
  process.stdout.write(`\x1B[${dropdownLines}A`);
  process.stdout.write("\x1B[u");

  dropdownVisible = false;
  dropdownLines = 0;
}

function completer(line: string): [string[], string] {
  if (!line.startsWith("/")) return [[], line];

  const partial = line.slice(1).toLowerCase();
  const matches = registry.getAll()
    .filter((c) => c.name.startsWith(partial))
    .map((c) => `/${c.name}`);

  return [matches, line];
}

function promptUser(rl: readline.Interface): void {
  if (messageCount > 0 && messageCount % 4 === 0) {
    process.stdout.write(`  ${TIPS[tipIndex % TIPS.length]}\n\n`);
    tipIndex++;
  }

  rl.question(ACCENT_BOLD("  → "), async (input) => {
    clearDropdown();
    const trimmed = input.trim();
    messageCount++;

    if (!trimmed) {
      promptUser(rl);
      return;
    }

    if (trimmed.startsWith("/")) {
      const handled = await registry.execute(trimmed);
      if (handled) {
        promptUser(rl);
        return;
      }
    }

    respond(trimmed.startsWith("/") ? trimmed.slice(1) : trimmed);
    promptUser(rl);
  });
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
