#!/usr/bin/env node

import { playStartupAnimation, printBanner } from "../ui/animation.js";
import { startChat } from "../ui/prompt.js";
import { registerHelpCommand } from "../commands/help.js";
import { registerBuiltinCommands } from "../commands/builtins.js";

declare const __AETHER_VERSION__: string;
const VERSION = typeof __AETHER_VERSION__ !== "undefined"
  ? __AETHER_VERSION__
  : "0.0.0-dev";

async function main(): Promise<void> {
  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    process.stdout.write(`aether v${VERSION}\n`);
    process.exit(0);
  }

  registerHelpCommand();
  registerBuiltinCommands();

  const isInteractive = process.stdin.isTTY ?? false;
  const noAnimation = process.argv.includes("--no-animation");

  if (isInteractive && !noAnimation) {
    await playStartupAnimation();
  } else {
    printBanner();
  }

  startChat();
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
