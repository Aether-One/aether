#!/usr/bin/env node

import { playStartupAnimation, printBanner } from "../ui/animation.js";
import { startChat } from "../ui/prompt.js";
import { registerHelpCommand } from "../commands/help.js";
import { registerBuiltinCommands } from "../commands/builtins.js";

async function main(): Promise<void> {
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
