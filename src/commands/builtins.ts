import chalk from "chalk";
import { registry } from "./registry.js";

const ACCENT = chalk.hex("#895bf4");
const DIM = chalk.dim;

export function registerBuiltinCommands(): void {
  registry.register({
    name: "genesis",
    description: "Analyze and document your project",
    usage: "/genesis [--provider <name>] [--model <model>]",
    handler: () => {
      process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether")}\n\n`);
      process.stdout.write(chalk.yellow("     Genesis is coming soon.\n"));
      process.stdout.write(DIM("     This will scan, analyze, and document your project.\n\n"));
    },
  });

  registry.register({
    name: "exit",
    description: "Exit Aether",
    handler: () => {
      process.stdout.write(`\n${DIM("  ✦ Goodbye.")}\n\n`);
      process.exit(0);
    },
  });

  registry.register({
    name: "clear",
    description: "Clear the screen",
    handler: () => {
      process.stdout.write("\x1Bc");
    },
  });
}
