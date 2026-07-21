import { registry } from "./registry.js";
import { formatPingError, formatError } from "./builtins.js";
import { loadConfig } from "../config/index.js";
import { createProvider } from "../providers/factory.js";
import { MeteredProvider } from "../providers/metered.js";
import { chatWithRetry, formatRetryLine } from "../providers/retry.js";
import { BASE_PROMPT, PROMPT_SUFFIX, ASK_PROMPT, buildAskPrompt } from "../prompts/index.js";
import { DOC_CONTEXT_BUDGET } from "../genesis/constants.js";
import { watchCancelKey } from "../ui/cancel.js";
import { LineSpinner } from "../ui/steps.js";
import { renderMarkdown } from "../ui/markdown.js";
import { ACCENT, DIM, SUCCESS, WARN, ERROR } from "../ui/theme.js";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function registerAskCommand(): void {
  registry.register({
    name: "ask",
    description: "Ask a question about your project, answered from its docs",
    usage: "/ask <question>",
    handler: async (args) => {
      const question = args.trim();

      if (question === "--help" || question === "-h" || question === "help") {
        showAskHelp();
        return;
      }
      if (!question) {
        process.stdout.write(`\n     ${WARN("!")} Ask me something — e.g. ${ACCENT("/ask How do I configure the provider?")}\n\n`);
        return;
      }

      const targetDir = process.cwd();
      const docsDir = join(targetDir, ".aether", "docs");

      if (!existsSync(docsDir)) {
        process.stdout.write(`\n     ${WARN("!")} No docs found at ${DIM(".aether/docs/")}.\n`);
        process.stdout.write(`     ${DIM("Run")} /genesis ${DIM("first so /ask has a knowledge base to answer from.")}\n\n`);
        return;
      }

      const docsContext = await buildDocsContext(docsDir, DOC_CONTEXT_BUDGET);
      if (!docsContext.trim()) {
        process.stdout.write(`\n     ${WARN("!")} No documentation content found under ${DIM(".aether/docs/")}.\n`);
        process.stdout.write(`     ${DIM("Run")} /genesis ${DIM("to generate the docs first.")}\n\n`);
        return;
      }

      const config = await loadConfig(targetDir);
      if (!config) {
        process.stdout.write(`\n     ${ERROR("✗")} No config found.\n`);
        process.stdout.write(`     ${DIM("Run")} /config ${DIM("to set up your AI provider first.")}\n\n`);
        return;
      }

      process.stdout.write(`\n${ACCENT("  ✦ ")}${DIM("aether ask")}\n\n`);

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

        // Single Q&A call, cancellable with ESC.
        process.stdout.write(`     ${DIM("Press")} ${ACCENT("ESC")} ${DIM("to cancel.")}\n`);
        const controller = new AbortController();
        provider.setSignal(controller.signal);
        const stopCancel = watchCancelKey(() => controller.abort());

        const spinner = new LineSpinner("Reading the docs...");
        spinner.start();
        let answer: string;
        try {
          const response = await chatWithRetry(
            provider,
            {
              model: config.model,
              messages: [
                {
                  role: "user",
                  content: `${BASE_PROMPT}\n\n${ASK_PROMPT}\n\n${buildAskPrompt(question, docsContext)}\n\n${PROMPT_SUFFIX}`,
                },
              ],
              temperature: 0.3,
              signal: controller.signal,
            },
            {
              maxRetries: 3,
              baseDelay: 2000,
              onRetry: (attempt, max, error) => spinner.log(formatRetryLine(attempt, max, error)),
            },
          );
          answer = response.content;
          spinner.succeed();
        } catch (err) {
          spinner.fail();
          if (controller.signal.aborted) {
            process.stdout.write(`\n     ${DIM("Cancelled.")}\n\n`);
            return;
          }
          throw err;
        } finally {
          stopCancel();
          provider.setSignal(undefined);
        }

        if (!answer.trim()) {
          process.stdout.write(`\n     ${WARN("!")} The model returned an empty answer. Try rephrasing your question.\n\n`);
          return;
        }

        // Render the markdown answer to styled terminal output, indented to match the CLI.
        process.stdout.write("\n");
        for (const line of renderMarkdown(answer.trim()).split("\n")) {
          process.stdout.write(line ? `     ${line}\n` : "\n");
        }
        process.stdout.write("\n");
      } catch (err) {
        process.stdout.write(`\n\n${ERROR("  ✗")} ${formatError(err)}\n\n`);
      }
    },
  });
}

async function buildDocsContext(docsDir: string, budget: number): Promise<string> {
  const files = (await collectMarkdown(docsDir)).sort();
  const parts: string[] = [];
  let remaining = budget;

  for (const path of files) {
    if (remaining <= 0) break;
    try {
      const content = (await readFile(path, "utf-8")).slice(0, remaining);
      if (!content.trim()) continue;
      const rel = path.slice(docsDir.length + 1).replace(/\\/g, "/");
      const block = `## ${rel}\n\n${content}`;
      remaining -= block.length;
      parts.push(block);
    } catch {
      // best-effort — skip unreadable docs
    }
  }

  return parts.join("\n\n");
}

/** Recursively lists all `.md` file paths under `dir`. */
async function collectMarkdown(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectMarkdown(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function showAskHelp(): void {
  process.stdout.write(
    `\n  ${ACCENT("/ask")} — ask a question about your project, answered from its docs\n\n` +
      `  ${DIM("Usage:")}\n` +
      `    ${ACCENT("/ask")} ${DIM("<question>")}   ${DIM("(no quotes needed)")}\n\n` +
      `  ${DIM("It reads your")} .aether/docs ${DIM("and answers grounded in that knowledge base,")}\n` +
      `  ${DIM("using your configured AI provider. If the docs don't cover it, it says so.")}\n\n` +
      `  ${DIM("Example:")}\n` +
      `    ${ACCENT("/ask")} ${DIM("How do I configure the provider?")}\n\n` +
      `  ${DIM("Run")} /genesis ${DIM("first if there are no docs yet.")}\n\n`,
  );
}
