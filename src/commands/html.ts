import chalk from "chalk";
import { existsSync, statSync } from "node:fs";
import { registry } from "./registry.js";
import { buildHtmlDocs } from "../html/build.js";
import { ACCENT, DIM, SUCCESS } from "../ui/theme.js";

export function registerHtmlCommand(): void {
  registry.register({
    name: "html",
    description: "Build a browsable HTML viewer for the docs (free — no tokens)",
    usage: "/html [path]",
    handler: async (args) => {
      const trimmed = args.trim();
      if (trimmed === "--help" || trimmed === "-h" || trimmed === "help") {
        showHtmlHelp();
        return;
      }

      const targetDir = trimmed || process.cwd();
      if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
        process.stdout.write(`\n${chalk.red("  ✗")} Directory not found: ${targetDir}\n\n`);
        return;
      }

      process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether html")}\n\n`);

      const result = await buildHtmlDocs(targetDir);
      if (!result) {
        process.stdout.write(`     ${chalk.yellow("!")} No generated docs found at ${DIM(".aether/docs/")}.\n`);
        process.stdout.write(`     ${DIM("Run")} /genesis ${DIM("first — /html builds the viewer from those docs.")}\n\n`);
        return;
      }

      process.stdout.write(
        `     ${SUCCESS("✓")} Built ${ACCENT(".aether/docs.html")} ${DIM(`(${result.pages} pages)`)} — open it in your browser.\n`,
      );
      process.stdout.write(`     ${DIM("Sidebar navigation, full-text search, and clickable cross-doc links.")}\n\n`);
    },
  });
}

function showHtmlHelp(): void {
  process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether html")}\n\n`);
  process.stdout.write(`     Build a single-file HTML viewer for the generated docs.\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /html              ${DIM("— build .aether/docs.html for the current directory")}\n`);
  process.stdout.write(`       /html <path>       ${DIM("— build for a specific directory")}\n\n`);
  process.stdout.write(`     ${DIM("What you get:")}\n`);
  process.stdout.write(`       A single ${ACCENT(".aether/docs.html")} you can open in any browser — sidebar\n`);
  process.stdout.write(`       navigation, full-text search across every page, clickable links\n`);
  process.stdout.write(`       between docs, light/dark theme, and rendered Mermaid diagrams.\n\n`);
  process.stdout.write(`     ${DIM("Free:")} generated locally from the markdown in .aether/docs/ — no AI calls,\n`);
  process.stdout.write(`     ${DIM("no tokens. Diagrams render via CDN when online; offline they fall back")}\n`);
  process.stdout.write(`     ${DIM("to their source with a notice.")}\n\n`);
  process.stdout.write(`     ${DIM("When docs change,")} /sync ${DIM("refreshes docs.html automatically if it exists.")}\n\n`);
}
