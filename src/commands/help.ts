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
      process.stdout.write(chalk.white("     Available commands:\n\n"));

      for (const cmd of commands) {
        process.stdout.write(`     ${ACCENT(`/${cmd.name}`).padEnd(32)} ${DIM(cmd.description)}\n`);
        if (cmd.usage) {
          process.stdout.write(`     ${"".padEnd(20)} ${DIM(cmd.usage)}\n`);
        }
      }

      process.stdout.write(`\n${DIM("     Tip: use /command help for detailed info on each command.")}\n\n`);
    },
  });
}
