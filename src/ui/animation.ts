import chalk from "chalk";
import { ACCENT, ACCENT_BOLD } from "./theme.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function playStartupAnimation(): Promise<void> {
  process.stdout.write("\x1Bc");
  await sleep(400);

  process.stdout.write("\n\n");
  await sleep(200);

  process.stdout.write(chalk.hex("#4a3080")("        ·  ✧     ˚        ✦    ·      ˚\n"));
  await sleep(150);

  process.stdout.write(chalk.hex("#6b42c9")("           ✦        ⊹    ·        ✧\n"));
  await sleep(150);

  process.stdout.write("\n");
  await sleep(300);

  const logo = "⚡ aether";
  for (let i = 1; i <= logo.length; i++) {
    process.stdout.write(`\r        ${ACCENT_BOLD(logo.slice(0, i))}`);
    await sleep(70);
  }
  process.stdout.write("\n");
  await sleep(400);

  process.stdout.write(chalk.dim("        Your AI-native workspace companion.\n"));
  await sleep(300);

  process.stdout.write("\n");
  process.stdout.write(chalk.hex("#4a3080")("           ·     ✧    ˚     ·    ✦      ⊹\n"));
  await sleep(200);

  process.stdout.write("\n");
  process.stdout.write(chalk.dim("     ─────────────────────────────────────────\n"));
  await sleep(200);

  process.stdout.write("\n");
  process.stdout.write(chalk.dim("     Type ") + ACCENT("/help") + chalk.dim(" to get started.\n"));
  process.stdout.write("\n");
}

export function printBanner(): void {
  process.stdout.write("\n");
  process.stdout.write(`        ${ACCENT_BOLD("⚡ aether")}\n`);
  process.stdout.write(chalk.dim("        Your AI-native workspace companion.\n"));
  process.stdout.write("\n");
  process.stdout.write(chalk.dim("     ─────────────────────────────────────────\n"));
  process.stdout.write("\n");
  process.stdout.write(chalk.dim("     Type ") + ACCENT("/help") + chalk.dim(" to get started.\n"));
  process.stdout.write("\n");
}
