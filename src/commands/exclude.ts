import chalk from "chalk";
import { registry } from "./registry.js";
import { loadExcludes, addExclude, removeExclude } from "../genesis/exclude.js";
import { ACCENT, DIM, SUCCESS } from "../ui/theme.js";

export function registerExcludeCommand(): void {
  registry.register({
    name: "exclude",
    description: "Skip large paths that don't need documenting during genesis/sync",
    usage: "/exclude <path>  (or type @ in the prompt to pick one)",
    handler: async (args) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const sub = tokens[0]?.toLowerCase();
      const rootDir = process.cwd();

      if (sub === "--help" || sub === "-h" || sub === "help") {
        showExcludeHelp();
        return;
      }

      // No path (or `list`) → show what's excluded and how to add more.
      if (!sub || sub === "list") {
        await showList(rootDir);
        return;
      }

      if (sub === "remove" || sub === "rm") {
        const path = tokens.slice(1).join(" ");
        if (!path) {
          process.stdout.write(`\n${chalk.red("  ✗")} Nothing to remove — give a path.\n\n`);
          return;
        }
        const { removed, entry } = await removeExclude(rootDir, path);
        if (removed) {
          process.stdout.write(`\n${SUCCESS("  ✓")} No longer excluded: ${ACCENT(entry)}\n`);
          process.stdout.write(`     ${DIM("Run")} /sync ${DIM("to re-include it.")}\n\n`);
        } else {
          process.stdout.write(`\n${DIM("  •")} ${DIM(`Not in the exclude list: ${entry}`)}\n\n`);
        }
        return;
      }

      const path = tokens.join(" ");
      const { added, entry } = await addExclude(rootDir, path);
      if (!entry) {
        process.stdout.write(`\n${chalk.red("  ✗")} Invalid path.\n\n`);
        return;
      }
      if (added) {
        process.stdout.write(`\n${SUCCESS("  ✓")} Excluded ${ACCENT(entry)} ${DIM("from the scan.")}\n`);
        process.stdout.write(`     ${DIM("Run")} /sync ${DIM("(or")} /genesis --force${DIM(") to apply.")}\n\n`);
      } else {
        process.stdout.write(`\n${DIM("  •")} ${DIM(`Already excluded: ${entry}`)}\n\n`);
      }
    },
  });
}

async function showList(rootDir: string): Promise<void> {
  const excludes = await loadExcludes(rootDir);
  process.stdout.write(`\n${ACCENT("  ⊘ ")}${DIM("aether exclude")}\n\n`);

  if (excludes.length === 0) {
    process.stdout.write(`     ${DIM("Nothing excluded yet.")}\n`);
    process.stdout.write(`     ${DIM("Type")} ${ACCENT("/exclude @")} ${DIM("to pick a path, or")} ${ACCENT("/exclude <path>")}${DIM(".")}\n\n`);
    return;
  }

  process.stdout.write(`     ${DIM("Excluded from the scan:")}\n`);
  for (const entry of excludes) {
    process.stdout.write(`       ${DIM("•")} ${entry}\n`);
  }
  process.stdout.write(`\n     ${DIM("Add with")} ${ACCENT("/exclude @")} ${DIM("· remove with")} ${ACCENT("/exclude remove <path>")}\n\n`);
}

function showExcludeHelp(): void {
  process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether exclude")}\n\n`);
  process.stdout.write(`     Keep large, irrelevant paths out of the scan — smaller context, lower cost.\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /exclude ${ACCENT("@")}${DIM("                  — type @ to fill in a path: filter, ↑↓ move, ⏎ insert")}\n`);
  process.stdout.write(`       /exclude <path>             ${DIM("— exclude a file or folder directly")}\n`);
  process.stdout.write(`       /exclude                    ${DIM("— show what's excluded")}\n`);
  process.stdout.write(`       /exclude remove <path>      ${DIM("— re-include a path")}\n\n`);
  process.stdout.write(`     ${DIM("Examples:")}\n`);
  process.stdout.write(`       /exclude packages/legacy    ${DIM("— skip a whole folder")}\n`);
  process.stdout.write(`       /exclude generated          ${DIM("— skip every 'generated' dir in the tree")}\n\n`);
  process.stdout.write(`     ${DIM("Stored in")} .aether/settings/exclude.json ${DIM("(commit it to share).")}\n\n`);
}
