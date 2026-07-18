import chalk from "chalk";
import { registry } from "./registry.js";

const ACCENT = chalk.hex("#895bf4");
const DIM = chalk.dim;

export function registerHelpCommand(): void {
  registry.register({
    name: "help",
    description: "Show available commands",
    handler: () => {
      const commands = registry.getAll();

      process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether")}\n\n`);
      process.stdout.write(chalk.white("     Here's what I can do:\n\n"));

      for (const cmd of commands) {
        process.stdout.write(`     ${ACCENT(`/${cmd.name}`).padEnd(32)} ${DIM(cmd.description)}\n`);
      }

      process.stdout.write(`\n${DIM("     Or just type a message — I'm here to help.")}\n\n`);
    },
  });
}
