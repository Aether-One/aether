import chalk from "chalk";
import { registry } from "./registry.js";
import { formatPingError, formatError } from "./builtins.js";
import { loadConfig } from "../config/index.js";
import { createProvider } from "../providers/factory.js";
import { MeteredProvider } from "../providers/metered.js";
import { chatWithRetry, formatRetryLine } from "../providers/retry.js";
import { scanContext } from "../genesis/context.js";
import { loadSnapshot, diffFingerprint, hasChanges } from "../genesis/sync.js";
import { BASE_PROMPT, PROMPT_SUFFIX, OPTIMIZE_PROMPT, buildOptimizePrompt } from "../prompts/index.js";
import { promptConfirm } from "../ui/confirm.js";
import { watchCancelKey } from "../ui/cancel.js";
import { LineSpinner } from "../ui/steps.js";
import { ACCENT, DIM, SUCCESS, WARN, ERROR } from "../ui/theme.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FileDiff, ProjectContext } from "../genesis/types.js";

const CONTEXT_DOCS = ["README.md", "AI_CONTEXT.md", "architecture/folder-structure.md"];
const MAX_DOC_CHARS = 24_000;
const MAX_TREE_CHARS = 8_000;

export function registerPromptCommand(): void {
  registry.register({
    name: "prompt",
    description: "Turn a task into an optimized, file-referencing prompt for another AI",
    usage: "/prompt <what you want to do>",
    handler: async (args) => {
      const intent = args.trim();

      if (intent === "--help" || intent === "-h" || intent === "help") {
        showPromptHelp();
        return;
      }
      if (!intent) {
        process.stdout.write(`\n     ${WARN("!")} Tell me what you want to do — e.g. ${ACCENT('/prompt add a --json flag to the export command')}\n\n`);
        return;
      }

      const targetDir = process.cwd();

      if (!existsSync(join(targetDir, ".aether", "docs"))) {
        process.stdout.write(`\n     ${WARN("!")} No docs found at ${DIM(".aether/docs/")}.\n`);
        process.stdout.write(`     ${DIM("Run")} /genesis ${DIM("first so /prompt has a knowledge base to work from.")}\n\n`);
        return;
      }

      const config = await loadConfig(targetDir);
      if (!config) {
        process.stdout.write(`\n     ${ERROR("✗")} No config found.\n`);
        process.stdout.write(`     ${DIM("Run")} /config ${DIM("to set up your AI provider first.")}\n\n`);
        return;
      }

      process.stdout.write(`\n${ACCENT("  ✦ ")}${DIM("aether prompt")}\n\n`);

      const provider = new MeteredProvider(createProvider(config));

      try {
        // Connect
        process.stdout.write(`     ${DIM("Connecting to")} ${config.provider} (${config.model})...`);
        const ping = await provider.ping();
        if (!ping.ok) {
          process.stdout.write(`\n\n${formatPingError(config, ping)}\n\n`);
          return;
        }
        process.stdout.write(` ${SUCCESS("✓")}\n`);

        process.stdout.write(`     ${DIM("Reading project...")}`);
        const context = await scanContext(targetDir);
        process.stdout.write(` ${SUCCESS("✓")}\n`);

        // Warn (and confirm) if the docs no longer match the code on disk.
        const stale = await checkStaleness(targetDir, context);
        if (stale.isStale) {
          printStaleWarning(stale.diff!, stale.generatedAt!);
          const proceed = await promptConfirm(`     ${DIM("Generate from possibly-outdated docs anyway?")} ${ACCENT("[Y/n]")} `);
          if (!proceed) {
            process.stdout.write(`\n     ${DIM("Cancelled. Run")} ${ACCENT("/sync")} ${DIM("to refresh the docs, then try again.")}\n\n`);
            return;
          }
        } else if (stale.unverifiable) {
          process.stdout.write(`     ${DIM("(No snapshot to verify docs freshness — run")} ${ACCENT("/sync")} ${DIM("if the docs feel stale.)")}\n`);
        }

        const docsContext = await buildDocsContext(targetDir, context.directoryTree);

        // Single optimizer call, cancellable with ESC.
        process.stdout.write(`     ${DIM("Press")} ${ACCENT("ESC")} ${DIM("to cancel.")}\n`);
        const controller = new AbortController();
        provider.setSignal(controller.signal);
        const stopCancel = watchCancelKey(() => controller.abort());

        const spinner = new LineSpinner("Crafting your optimized prompt...");
        spinner.start();
        let raw: string;
        try {
          const response = await chatWithRetry(
            provider,
            {
              model: config.model,
              messages: [{ role: "user", content: `${BASE_PROMPT}\n\n${OPTIMIZE_PROMPT}\n\n${buildOptimizePrompt(intent, docsContext)}\n\n${PROMPT_SUFFIX}` }],
              temperature: 0.3,
              signal: controller.signal,
            },
            { onRetry: (attempt, max, error) => spinner.log(formatRetryLine(attempt, max, error)) },
          );
          raw = response.content;
          spinner.succeed();
        } catch (err) {
          spinner.fail();
          if (controller.signal.aborted) {
            process.stdout.write(`\n     ${DIM("Cancelled — nothing was written.")}\n\n`);
            return;
          }
          throw err;
        } finally {
          stopCancel();
          provider.setSignal(undefined);
        }

        const { slug, body } = parseOptimized(raw, intent);
        if (!body) {
          process.stdout.write(`\n     ${WARN("!")} The model returned an empty prompt. Try rephrasing your request.\n\n`);
          return;
        }

        const outPath = await uniquePromptPath(targetDir, slug);
        await writeFile(outPath, composeFile(intent, body, config, stale.isStale), "utf-8");

        const rel = outPath.slice(targetDir.length + 1).replace(/\\/g, "/");
        process.stdout.write(`\n     ${SUCCESS("✓")} Optimized prompt saved to ${ACCENT(rel)}\n`);
        process.stdout.write(`     ${DIM("Review the file paths and scope, then paste it into Claude, Kiro, or your AI of choice.")}\n\n`);
      } catch (err) {
        process.stdout.write(`\n\n${ERROR("  ✗")} ${formatError(err)}\n\n`);
      }
    },
  });
}

interface Staleness {
  isStale: boolean;
  unverifiable: boolean;
  diff?: FileDiff;
  generatedAt?: string;
}

// Reuses the /sync machinery: diff the saved fingerprint against a fresh scan.
async function checkStaleness(targetDir: string, context: ProjectContext): Promise<Staleness> {
  const snapshot = await loadSnapshot(targetDir);
  if (!snapshot) return { isStale: false, unverifiable: true };

  const diff = diffFingerprint(snapshot.files, context);
  if (!hasChanges(diff)) return { isStale: false, unverifiable: false };
  return { isStale: true, unverifiable: false, diff, generatedAt: snapshot.generatedAt };
}

function printStaleWarning(diff: FileDiff, generatedAt: string): void {
  process.stdout.write(
    `\n     ${WARN("!")} Your docs are out of date — the code has changed since they were generated${DIM(` (${generatedAt})`)}.\n` +
      `       ${DIM(`${diff.added.length} added · ${diff.modified.length} modified · ${diff.deleted.length} removed`)}\n` +
      `       ${DIM("Run")} ${ACCENT("/sync")} ${DIM("first for the most accurate prompt.")}\n\n`,
  );
}

async function buildDocsContext(targetDir: string, directoryTree: string): Promise<string> {
  const docsDir = join(targetDir, ".aether", "docs");
  const parts: string[] = [];
  let budget = MAX_DOC_CHARS;

  for (const rel of CONTEXT_DOCS) {
    const path = join(docsDir, rel);
    if (!existsSync(path) || budget <= 0) continue;
    try {
      const content = (await readFile(path, "utf-8")).slice(0, budget);
      budget -= content.length;
      parts.push(`## ${rel}\n\n${content}`);
    } catch {
      // best-effort — a missing/unreadable doc just means less context
    }
  }

  parts.push(`## Directory tree\n\n\`\`\`\n${directoryTree.slice(0, MAX_TREE_CHARS)}\n\`\`\``);
  return parts.join("\n\n");
}

function parseOptimized(raw: string, intent: string): { slug: string; body: string } {
  const text = raw.trim();
  const match = text.match(/^\s*SLUG:\s*(.+?)\s*(?:\n|$)/i);
  if (match) {
    const slug = slugify(match[1]);
    const body = text.slice(match[0].length).trim();
    if (slug && body) return { slug, body };
  }
  return { slug: slugify(intent), body: text };
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 8)
    .join("-")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return slug || "prompt";
}

// Never overwrite: <slug>.md, then <slug>-2.md, <slug>-3.md, …
async function uniquePromptPath(targetDir: string, slug: string): Promise<string> {
  const dir = join(targetDir, ".aether", "prompts");
  await mkdir(dir, { recursive: true });
  let candidate = join(dir, `${slug}.md`);
  let n = 2;
  while (existsSync(candidate)) {
    candidate = join(dir, `${slug}-${n}.md`);
    n++;
  }
  return candidate;
}

function composeFile(
  intent: string,
  body: string,
  config: { provider: string; model: string },
  stale: boolean,
): string {
  const lines = [
    "<!-- Generated by Aether /prompt -->",
    "> ⚠️ **AI-generated prompt built from your `.aether/docs`.** Review the file paths and scope before pasting it into Claude, Kiro, or any other AI.",
  ];
  if (stale) {
    lines.push("> ⚠️ **Docs were out of date when this was generated** — run `/sync` and regenerate for the most accurate result.");
  }
  lines.push(
    "",
    `**Original request:** ${intent}`,
    `**Generated:** ${new Date().toISOString()} · ${config.provider} · ${config.model}`,
    "",
    "---",
    "",
    body,
    "",
  );
  return lines.join("\n");
}

function showPromptHelp(): void {
  process.stdout.write(
    `\n  ${ACCENT("/prompt")} — turn a task into an optimized prompt for another AI\n\n` +
      `  ${DIM("Usage:")}\n` +
      `    ${ACCENT("/prompt")} ${DIM("<what you want to do>")}   ${DIM("(no quotes needed)")}\n\n` +
      `  ${DIM("It reads your")} .aether/docs ${DIM("and writes a concise, file-referencing prompt to")}\n` +
      `  .aether/prompts/ ${DIM("that another AI can run with far less context — saving tokens.")}\n\n` +
      `  ${DIM("Example:")}\n` +
      `    ${ACCENT("/prompt")} ${DIM("add rate-limit handling to the openrouter provider")}\n\n`,
  );
}
