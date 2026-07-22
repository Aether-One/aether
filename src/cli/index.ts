#!/usr/bin/env node

import { playStartupAnimation, printBanner } from "../ui/animation.js";
import { startChat } from "../ui/prompt.js";
import { registerHelpCommand } from "../commands/help.js";
import { registerBuiltinCommands } from "../commands/builtins.js";
import { registerConfigCommand } from "../commands/config.js";
import { registerCleanCommand } from "../commands/clean.js";
import { registerCleanCodeCommand } from "../commands/cleancode.js";
import { registerExcludeCommand } from "../commands/exclude.js";
import { registerPromptCommand } from "../commands/prompt.js";
import { registerAskCommand } from "../commands/ask.js";
import { registerHtmlCommand } from "../commands/html.js";

declare const __AETHER_VERSION__: string;
const VERSION =
  typeof __AETHER_VERSION__ !== "undefined" ? __AETHER_VERSION__ : "0.0.0-dev";

async function main(): Promise<void> {
  if (
    process.argv.includes("--version") ||
    process.argv.includes("-v") ||
    process.argv.includes("-version")
  ) {
    process.stdout.write(`aether v${VERSION}\n`);
    process.exit(0);
  }

  registerHelpCommand();
  registerBuiltinCommands();
  registerConfigCommand();
  registerCleanCommand();
  registerCleanCodeCommand();
  registerExcludeCommand();
  registerPromptCommand();
  registerAskCommand();
  registerHtmlCommand();

  const isInteractive = process.stdin.isTTY ?? false;
  const noAnimation = process.argv.includes("--no-animation");

  if (isInteractive && !noAnimation) {
    await playStartupAnimation();
  } else {
    printBanner();
  }

  await startChat();
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
