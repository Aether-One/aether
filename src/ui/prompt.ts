import type { Key } from "node:readline";
import chalk from "chalk";
import { TextPrompt, isCancel } from "@clack/core";
import { registry } from "../commands/registry.js";
import { collectDirectories, collectSourceFiles } from "../genesis/context.js";
import { loadExcludes } from "../genesis/exclude.js";

import { ACCENT, ACCENT_BOLD, DIM } from "./theme.js";

const TIPS = [
  `${DIM("tip:")} use ${ACCENT("/genesis")} to analyze your project`,
  `${DIM("tip:")} ${ACCENT("Tab")} to autocomplete commands`,
  `${DIM("tip:")} ${ACCENT("/ask")} answers questions from your project docs`,
  `${DIM("tip:")} ${ACCENT("/exclude @")} picks a path to skip`,
  `${DIM("tip:")} ${ACCENT("/cleancode review @")} picks a file or folder to review`,
  `${DIM("tip:")} ${ACCENT("/clear")} clears the screen`,
  `${DIM("tip:")} just type a message to chat`,
];

const MAX_DROPDOWN = 6;
const MAX_PATH_DROPDOWN = 10;
const REMOVE_RE = /^\/exclude\s+(?:remove|rm)\b/;
const CLEANCODE_RE = /^\/cleancode\b/;

let tipIndex = 0;
let messageCount = 0;

async function loadDirPaths(): Promise<string[]> {
  try {
    return await collectDirectories(process.cwd(), await loadExcludes(process.cwd()));
  } catch {
    return [];
  }
}

async function loadFilePaths(): Promise<string[]> {
  try {
    return await collectSourceFiles(process.cwd(), await loadExcludes(process.cwd()));
  } catch {
    return [];
  }
}

export async function startChat(): Promise<void> {
  let dirs = await loadDirPaths();
  let files = await loadFilePaths();
  let excluded = await loadExcludes(process.cwd());

  for (;;) {
    if (messageCount > 0 && messageCount % 4 === 0) {
      process.stdout.write(`  ${TIPS[tipIndex % TIPS.length]}\n\n`);
      tipIndex++;
    }

    const value = (await new ChatPrompt(dirs, files, excluded).prompt()) as string | symbol;

    // Ctrl+C — leave the same way the old readline "close" handler did.
    if (isCancel(value)) {
      process.stdout.write(`\n${DIM("  ✦ See you next time.")}\n\n`);
      process.exit(0);
    }

    messageCount++;
    const trimmed = String(value).trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("/")) {
      const handled = await registry.execute(trimmed);
      if (handled) {
        dirs = await loadDirPaths();
        files = await loadFilePaths();
        excluded = await loadExcludes(process.cwd());
        continue;
      }
    }

    respond(trimmed.startsWith("/") ? trimmed.slice(1) : trimmed);
  }
}

/** The `@partial` being typed at the end of the line, or null if there's no active mention. */
function activeMention(input: string): string | null {
  const m = input.match(/(?:^|\s)@([^\s@]*)$/);
  return m ? m[1] : null;
}

function filterPaths(paths: string[], partial: string): string[] {
  if (!partial) return paths;
  const q = partial.toLowerCase();
  const starts = paths.filter((p) => p.toLowerCase().startsWith(q));
  const rest = paths.filter((p) => !p.toLowerCase().startsWith(q) && p.toLowerCase().includes(q));
  return [...starts, ...rest];
}

/**
 * Single-line input with two live dropdowns: `/command` completion (Tab), and an
 * inline `@` path picker (type to filter, ↑↓ to move, ⏎ to exclude the highlighted path).
 */
class ChatPrompt extends TextPrompt {
  private pickerIndex = 0;
  private consumeReturn = false;

  constructor(
    private dirs: string[],
    private files: string[],
    private excluded: string[],
  ) {
    super({
      render(this: TextPrompt) {
        return (this as ChatPrompt).frame();
      },
    });

    this.on("key", (char: string | undefined, key: Key) => this.onKey(char, key));
  }

  private sourcePaths(): string[] {
    if (REMOVE_RE.test(this.userInput)) return this.excluded;
    if (CLEANCODE_RE.test(this.userInput)) return [...this.dirs, ...this.files];
    return this.dirs;
  }

  // When the @ picker is open, Enter fills in the highlighted path instead of submitting.
  protected _shouldSubmit(char: string | undefined, key: Key): boolean {
    if (this.consumeReturn) {
      this.consumeReturn = false;
      return false;
    }
    return super._shouldSubmit(char, key);
  }

  private onKey(_char: string | undefined, key: Key): void {
    const name = key?.name;
    if (name === "tab") {
      this.handleTab();
      return;
    }

    const mention = activeMention(this.userInput);

    if (name === "up" || name === "down") {
      if (mention === null) return;
      const n = filterPaths(this.sourcePaths(), mention).length;
      if (n === 0) return;
      this.pickerIndex = name === "up" ? (this.pickerIndex - 1 + n) % n : (this.pickerIndex + 1) % n;
      return;
    }

    if (name === "return") {
      // Insert the highlighted path where the @token is, then suppress this Enter's submit.
      if (mention !== null) {
        const matches = filterPaths(this.sourcePaths(), mention);
        if (matches.length > 0) {
          const picked = matches[Math.min(this.pickerIndex, matches.length - 1)];
          const at = this.userInput.lastIndexOf("@");
          const next = this.userInput.slice(0, at) + picked;
          this._clearUserInput();
          this._setUserInput(next, true);
          this.consumeReturn = true;
        }
      }
      return;
    }

    // Any typing/backspace re-filters — keep the highlight at the top.
    this.pickerIndex = 0;
  }

  private handleTab(): void {
    const raw = this.userInput.replace(/\t/g, "");
    const completed = completeSlash(raw);
    const next = completed ?? raw;
    if (next !== this.userInput) {
      this._clearUserInput();
      this._setUserInput(next, true);
    }
  }

  private frame(): string {
    const line = `${ACCENT_BOLD("  → ")}${this.userInputWithCursor}`;
    if (this.state === "submit" || this.state === "cancel") return line;

    const mention = activeMention(this.userInput);
    if (mention !== null) return `${line}${this.pathDropdown(mention)}`;
    return `${line}${buildDropdown(this.userInput)}`;
  }

  private pathDropdown(partial: string): string {
    const source = this.sourcePaths();
    const removing = REMOVE_RE.test(this.userInput);
    const matches = filterPaths(source, partial);
    if (matches.length === 0) {
      const why = removing ? "nothing excluded to remove" : "no matching paths";
      return `\n  ${DIM(`@ ${why} — backspace to cancel`)}`;
    }

    const idx = Math.min(this.pickerIndex, matches.length - 1);
    const start = Math.min(Math.max(0, idx - MAX_PATH_DROPDOWN + 1), Math.max(0, matches.length - MAX_PATH_DROPDOWN));
    const lines = matches.slice(start, start + MAX_PATH_DROPDOWN).map((p, i) => {
      const on = start + i === idx;
      return on ? `  ${ACCENT("❯")} ${ACCENT(p)}` : `    ${DIM(p)}`;
    });
    const verb = removing ? "re-include" : "insert";
    lines.push(
      matches.length > MAX_PATH_DROPDOWN
        ? DIM(`  ${matches.length} paths · ↑↓ move · ⏎ ${verb}`)
        : DIM(`  ↑↓ move · ⏎ ${verb}`),
    );
    return `\n${lines.join("\n")}`;
  }
}

/** The `/command` dropdown block (leading newline puts it below the input), or "" when hidden. */
export function buildDropdown(line: string): string {
  if (!line.startsWith("/")) return "";

  const partial = line.slice(1).toLowerCase();
  const commands = registry.getAll();
  const matches = partial.length === 0 ? commands : commands.filter((c) => c.name.startsWith(partial));

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
