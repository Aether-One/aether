import chalk from "chalk";
import { registry } from "./registry.js";
import { loadConfig } from "../config/index.js";
import { ensureProjectReadme } from "../config/scaffold.js";
import { GEN_CONCURRENCY } from "../genesis/constants.js";
import { createProvider } from "../providers/factory.js";
import { chatWithRetry, formatRetryLine } from "../providers/retry.js";
import { scanContext } from "../genesis/context.js";
import { buildPlannerDigest } from "../genesis/digest.js";
import { planDocs } from "../genesis/planner.js";
import { buildSharedProjectContext } from "../genesis/scope.js";
import { buildDocsIndex, buildDocPrompt } from "../genesis/docs.js";
import { getGitLog } from "../genesis/fingerprint.js";
import {
  loadSnapshot,
  diffFingerprint,
  hasChanges,
  planSync,
  refreshDoc,
  writeSnapshot,
  metaFromDefinition,
  mergeDocMetas,
  formatChanges,
} from "../genesis/sync.js";
import { StepRunner, LineSpinner } from "../ui/steps.js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

import { ACCENT, DIM, SUCCESS } from "../ui/theme.js";

export function registerBuiltinCommands(): void {
  registry.register({
    name: "genesis",
    description: "Analyze and document your project with AI",
    usage: "/genesis [path]",
    handler: async (args) => {
      const trimmedArgs = args.trim();

      // Help
      if (trimmedArgs === "--help" || trimmedArgs === "-h" || trimmedArgs === "help") {
        showGenesisHelp();
        return;
      }

      const tokens = trimmedArgs.split(/\s+/).filter(Boolean);
      const force = tokens.includes("--force");
      const targetDir = tokens.filter((t) => t !== "--force").join(" ") || process.cwd();

      // Validate path
      if (!existsSync(targetDir)) {
        process.stdout.write(`\n${chalk.red("  ✗")} Directory not found: ${targetDir}\n\n`);
        return;
      }
      if (!statSync(targetDir).isDirectory()) {
        process.stdout.write(`\n${chalk.red("  ✗")} Path is not a directory: ${targetDir}\n\n`);
        return;
      }

      // Docs already exist — don't burn API calls regenerating everything by default.
      if (!force && existsSync(join(targetDir, ".aether", "docs"))) {
        process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether genesis")}\n\n`);
        process.stdout.write(`     ${chalk.yellow("!")} Docs already exist at ${DIM(".aether/docs/")}.\n`);
        process.stdout.write(`     ${DIM("Regenerating everything from scratch isn't the best move once docs exist.")}\n\n`);
        process.stdout.write(`     ${DIM("Use")} ${ACCENT("/sync")} ${DIM("— it refreshes only the docs affected by what changed since the last run.")}\n\n`);
        process.stdout.write(`     ${DIM("To fully regenerate now anyway:")} /genesis --force\n\n`);
        return;
      }

      // Load config
      const config = await loadConfig(process.cwd());
      if (!config) {
        process.stdout.write(`\n${chalk.red("  ✗")} No config found.\n`);
        process.stdout.write(`     ${DIM("Run")} /config gemini ${DIM("to configure your AI provider first.\n\n")}`);
        return;
      }

      const provider = createProvider(config);

      try {
        // Phase 1: Connect + Scan + Plan (with temporary runner)
        process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether genesis")}\n\n`);

        // Connect
        process.stdout.write(`     ${DIM("Connecting to")} ${config.provider} (${config.model})...`);
        const alive = await provider.ping();
        if (!alive) {
          process.stdout.write(`\n\n${chalk.red("  ✗")} Cannot reach ${config.provider} at ${config.baseUrl}\n`);
          process.stdout.write(`     ${DIM("Make sure the service is running.\n\n")}`);
          return;
        }
        process.stdout.write(` ${SUCCESS("✓")}\n`);

        // Scan
        process.stdout.write(`     ${DIM("Scanning project...")}`)
        const context = await scanContext(targetDir);
        process.stdout.write(` ${SUCCESS("✓")}`);
        if (context.omittedFiles.length > 0) {
          process.stdout.write(` ${DIM(`(${context.omittedFiles.length} file(s) omitted — too large for context)`)}`);
        }
        process.stdout.write("\n");

        // Plan — ask AI which docs to generate.
        // This is the slowest single call (large context → long model latency),
        // so it gets a live spinner + elapsed timer instead of a frozen line.
        const planSpinner = new LineSpinner("Planning documentation...");
        planSpinner.start();
        let docsToGenerate;
        try {
          docsToGenerate = await planDocs(buildPlannerDigest(context), provider, config.model, {
            onRetry: (attempt, maxRetries, error) =>
              planSpinner.log(formatRetryLine(attempt, maxRetries, error)),
            onResolved: (docs) => planSpinner.succeed(`(${docs.length} docs)`),
          });
        } catch (err) {
          planSpinner.fail();
          throw err;
        }

        // Build ONE complete context, shared by every doc. If the whole project
        // fits, that's the real code; if not, it's distilled once here (not per
        // doc) so the expensive pass runs a single time and every doc stays complete.
        const ctxSpinner = new LineSpinner("Preparing project context...");
        ctxSpinner.start();
        let sharedContext: string;
        try {
          sharedContext = await buildSharedProjectContext(context, provider, config.model, {
            onStart: (batches) => {
              ctxSpinner.log(
                `     ${DIM(`This project is large — condensing it in ${batches} parts so nothing is lost.`)}`,
              );
              ctxSpinner.log(`     ${DIM("This can take a few minutes on slower models. Hang tight.")}`);
              ctxSpinner.setLabel(`Distilling project (${batches} chunk${batches > 1 ? "s" : ""})...`);
            },
            onBatch: (index, total) => ctxSpinner.setLabel(`Distilling project ${index}/${total}...`),
          });
          ctxSpinner.succeed();
        } catch (err) {
          ctxSpinner.fail();
          throw err;
        }

        // Phase 2: Generate docs with step runner
        const runner = new StepRunner("generating docs");
        for (const doc of docsToGenerate) {
          runner.addStep(doc.label);
        }

        runner.start();
        const startTime = Date.now();
        const aetherDir = join(targetDir, ".aether");

        // Docs are independent — generate several at once. Each is still a slow
        // model call, but the wall-clock drops by the concurrency factor.
        // Tune with AETHER_GEN_CONCURRENCY.
        try {
          await runner.runPooled(GEN_CONCURRENCY, async (i) => {
            const doc = docsToGenerate[i];
            // Every doc is generated from the same complete context.
            const prompt = buildDocPrompt(doc, sharedContext);
            const response = await chatWithRetry(
              provider,
              {
                model: config.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
              },
              {
                onRetry: (attempt, maxRetries, _error) =>
                  runner.setDetail(i, `retry ${attempt}/${maxRetries} — rate limited`),
              },
            );

            // Write file
            runner.setWriting(i);
            const outputPath = join(aetherDir, doc.outputPath);
            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, response.content, "utf-8");
          });
        } catch (err) {
          runner.error(`Failed generating docs: ${formatError(err)}`);
          return;
        }

        // Write the docs index (docs/README.md) — deterministic, no LLM call.
        const indexPath = join(aetherDir, "docs", "README.md");
        await mkdir(dirname(indexPath), { recursive: true });
        await writeFile(indexPath, buildDocsIndex(context.name, docsToGenerate), "utf-8");

        // Snapshot this run — the "point" /sync diffs against (file fingerprint + doc set).
        await writeSnapshot(
          targetDir,
          { provider: config.provider, model: config.model },
          context,
          docsToGenerate.map(metaFromDefinition),
        );
        await ensureProjectReadme(targetDir);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        runner.finish(`Genesis complete in ${elapsed}s → .aether/docs/`);
      } catch (err) {
        process.stdout.write(`\n\n${chalk.red("  ✗")} ${formatError(err)}\n\n`);
      }
    },
  });

  registry.register({
    name: "sync",
    description: "Refresh only the docs affected by what changed since the last run",
    usage: "/sync [path]",
    handler: async (args) => {
      const trimmedArgs = args.trim();

      if (trimmedArgs === "--help" || trimmedArgs === "-h" || trimmedArgs === "help") {
        showSyncHelp();
        return;
      }

      const targetDir = trimmedArgs || process.cwd();
      if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
        process.stdout.write(`\n${chalk.red("  ✗")} Directory not found: ${targetDir}\n\n`);
        return;
      }

      process.stdout.write(`\n${ACCENT("  ⟳ ")}${DIM("aether sync")}\n\n`);

      // Need a genesis baseline to diff against.
      const snapshot = await loadSnapshot(targetDir);
      if (!snapshot) {
        process.stdout.write(`     ${chalk.yellow("!")} No genesis snapshot found at ${DIM(".aether/settings/context.json")}.\n`);
        process.stdout.write(`     ${DIM("Run")} /genesis ${DIM("first to create the baseline docs.")}\n\n`);
        return;
      }

      const config = await loadConfig(process.cwd());
      if (!config) {
        process.stdout.write(`     ${chalk.red("✗")} No config found.\n`);
        process.stdout.write(`     ${DIM("Run")} /config gemini ${DIM("to configure your AI provider first.")}\n\n`);
        return;
      }

      const provider = createProvider(config);

      try {
        // Connect
        process.stdout.write(`     ${DIM("Connecting to")} ${config.provider} (${config.model})...`);
        if (!(await provider.ping())) {
          process.stdout.write(`\n\n${chalk.red("  ✗")} Cannot reach ${config.provider} at ${config.baseUrl}\n\n`);
          return;
        }
        process.stdout.write(` ${SUCCESS("✓")}\n`);

        // Scan + diff against the snapshot fingerprint
        process.stdout.write(`     ${DIM("Scanning for changes...")}`);
        const context = await scanContext(targetDir);
        const diff = diffFingerprint(snapshot.files, context);
        process.stdout.write(` ${SUCCESS("✓")}\n`);

        if (!hasChanges(diff)) {
          process.stdout.write(`\n     ${SUCCESS("✓")} ${DIM(`Docs already up to date — nothing changed since ${snapshot.generatedAt}.`)}\n\n`);
          return;
        }
        process.stdout.write(
          `     ${DIM(`${diff.added.length} added · ${diff.modified.length} modified · ${diff.deleted.length} removed`)}\n`,
        );

        // Plan which docs to refresh/add — never delete.
        const gitLog = snapshot.git?.commit ? getGitLog(targetDir, snapshot.git.commit) : null;
        const planSpinner = new LineSpinner("Deciding what to update...");
        planSpinner.start();
        let plan;
        try {
          plan = await planSync(buildPlannerDigest(context), diff, snapshot.docs, gitLog, provider, config.model, {
            onRetry: (attempt, maxRetries, error) => planSpinner.log(formatRetryLine(attempt, maxRetries, error)),
            onResolved: (p) => planSpinner.succeed(`(${p.regenerate.length} to refresh, ${p.add.length} new)`),
          });
        } catch (err) {
          planSpinner.fail();
          throw err;
        }

        const jobs = [
          ...plan.regenerate.map((doc) => ({ doc, update: true })),
          ...plan.add.map((doc) => ({ doc, update: false })),
        ];
        if (jobs.length === 0) {
          // Advance the baseline so the same changes aren't re-flagged next run.
          await writeSnapshot(targetDir, { provider: config.provider, model: config.model }, context, snapshot.docs);
          process.stdout.write(`\n     ${SUCCESS("✓")} ${DIM("Those changes don't affect any docs. Nothing to update.")}\n\n`);
          return;
        }

        // Same shared context as genesis, so refreshed docs stay complete and consistent.
        const ctxSpinner = new LineSpinner("Preparing project context...");
        ctxSpinner.start();
        let sharedContext: string;
        try {
          sharedContext = await buildSharedProjectContext(context, provider, config.model, {
            onStart: (batches) => {
              ctxSpinner.log(`     ${DIM(`This project is large — condensing it in ${batches} parts so nothing is lost.`)}`);
              ctxSpinner.setLabel(`Distilling project (${batches} chunk${batches > 1 ? "s" : ""})...`);
            },
            onBatch: (index, total) => ctxSpinner.setLabel(`Distilling project ${index}/${total}...`),
          });
          ctxSpinner.succeed();
        } catch (err) {
          ctxSpinner.fail();
          throw err;
        }

        // Refreshed docs are patched in update-mode — the model gets the current doc
        // and only revises what the change touched; nothing is deleted. New docs are
        // generated from scratch.
        const changeText = formatChanges(diff, gitLog);
        const runner = new StepRunner("updating docs");
        for (const { doc } of jobs) runner.addStep(doc.label);
        runner.start();
        const startTime = Date.now();
        const aetherDir = join(targetDir, ".aether");

        try {
          await runner.runPooled(GEN_CONCURRENCY, async (i) => {
            const { doc, update } = jobs[i];
            const outputPath = join(aetherDir, doc.outputPath);
            const existing = update ? await readFileSafe(outputPath) : null;

            let content: string;
            if (existing) {
              // Section-level patch: rewrite only the affected sections, keep the rest.
              content = await refreshDoc(doc, sharedContext, existing, changeText, provider, config.model);
            } else {
              const response = await chatWithRetry(provider, {
                model: config.model,
                messages: [{ role: "user", content: buildDocPrompt(doc, sharedContext) }],
                temperature: 0.3,
              }, {
                onRetry: (attempt, maxRetries, _error) =>
                  runner.setDetail(i, `retry ${attempt}/${maxRetries} — rate limited`),
              });
              content = response.content;
            }

            runner.setWriting(i);
            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, content, "utf-8");
          });
        } catch (err) {
          runner.error(`Failed updating docs: ${formatError(err)}`);
          return;
        }

        // Merge doc set, rebuild the index, and snapshot the new point.
        const mergedDocs = mergeDocMetas(snapshot.docs, plan.add);
        const indexPath = join(aetherDir, "docs", "README.md");
        await mkdir(dirname(indexPath), { recursive: true });
        await writeFile(indexPath, buildDocsIndex(context.name, mergedDocs), "utf-8");
        await writeSnapshot(targetDir, { provider: config.provider, model: config.model }, context, mergedDocs);
        await ensureProjectReadme(targetDir);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        runner.finish(`Sync complete in ${elapsed}s — ${plan.regenerate.length} refreshed, ${plan.add.length} added`);
      } catch (err) {
        process.stdout.write(`\n\n${chalk.red("  ✗")} ${formatError(err)}\n\n`);
      }
    },
  });

  registry.register({
    name: "exit",
    description: "Exit Aether",
    usage: "/exit",
    handler: () => {
      process.stdout.write(`\n${DIM("  ✦ Goodbye.")}\n\n`);
      process.exit(0);
    },
  });

  registry.register({
    name: "clear",
    description: "Clear the screen",
    usage: "/clear",
    handler: () => {
      process.stdout.write("\x1Bc");
    },
  });
}

function showGenesisHelp(): void {
  process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM("aether genesis")}\n\n`);
  process.stdout.write(`     Analyze your project with AI and generate documentation.\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /genesis              ${DIM("— analyze current directory")}\n`);
  process.stdout.write(`       /genesis <path>       ${DIM("— analyze a specific directory")}\n`);
  process.stdout.write(`       /genesis --force      ${DIM("— regenerate even if .aether/docs already exists")}\n\n`);
  process.stdout.write(`     ${DIM("Requirements:")}\n`);
  process.stdout.write(`       Configure a provider first with /config\n\n`);
  process.stdout.write(`     ${DIM("If docs already exist, genesis will point you to")} /sync ${DIM("instead")}\n`);
  process.stdout.write(`     ${DIM("(incremental update — still under development).")}\n\n`);
  process.stdout.write(`     ${DIM("Generated docs:")}\n`);
  process.stdout.write(`       .aether/docs/\n`);
  process.stdout.write(`       ├── README.md                ${DIM("(always — index of everything below)")}\n`);
  process.stdout.write(`       ├── guides/\n`);
  process.stdout.write(`       │   ├── getting-started.md   ${DIM("(always — install & run, for humans)")}\n`);
  process.stdout.write(`       │   ├── onboarding.md        ${DIM("(always — mental model & the why)")}\n`);
  process.stdout.write(`       │   └── contributing.md      ${DIM("(if there's a real contribution process)")}\n`);
  process.stdout.write(`       ├── architecture/\n`);
  process.stdout.write(`       │   ├── system-overview.md   ${DIM("(always)")}\n`);
  process.stdout.write(`       │   ├── folder-structure.md  ${DIM("(always)")}\n`);
  process.stdout.write(`       │   ├── tech-stack.md        ${DIM("(always)")}\n`);
  process.stdout.write(`       │   └── coding-standards.md  ${DIM("(if applicable)")}\n`);
  process.stdout.write(`       ├── modules/overview.md      ${DIM("(if applicable)")}\n`);
  process.stdout.write(`       ├── api/endpoints.md         ${DIM("(only if there's an actual API/CLI to document)")}\n`);
  process.stdout.write(`       ├── business/rules.md        ${DIM("(if applicable)")}\n`);
  process.stdout.write(`       ├── diagrams/system.md       ${DIM("(if applicable)")}\n`);
  process.stdout.write(`       ├── AI_CONTEXT.md            ${DIM("(always)")}\n`);
  process.stdout.write(`       ├── glossary.md              ${DIM("(if applicable)")}\n`);
  process.stdout.write(`       └── ...                      ${DIM("+ custom docs the AI proposes for this project")}\n\n`);
  process.stdout.write(`     ${DIM("Everything except the")} (always) ${DIM("docs only gets generated when the AI")}\n`);
  process.stdout.write(`     ${DIM("finds real evidence for it — a frontend or devops project, for example,")}\n`);
  process.stdout.write(`     ${DIM("won't get api/endpoints.md just because it's in the catalog.\n\n")}`);
  process.stdout.write(`     ${DIM("The planner picks which of the above fit this project, and may add a")}\n`);
  process.stdout.write(`     ${DIM("few extra docs (e.g. a deployment pipeline) if something deserves one.\n\n")}`);
}

async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

function showSyncHelp(): void {
  process.stdout.write(`\n${ACCENT("  ⟳ ")}${DIM("aether sync")}\n\n`);
  process.stdout.write(`     Refresh docs after the project changed — without regenerating everything.\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /sync              ${DIM("— sync the current directory")}\n`);
  process.stdout.write(`       /sync <path>       ${DIM("— sync a specific directory")}\n\n`);
  process.stdout.write(`     ${DIM("How it works:")}\n`);
  process.stdout.write(`       Diffs the project against the last ${ACCENT("/genesis")} snapshot, then refreshes\n`);
  process.stdout.write(`       only the docs affected by what changed and adds new ones if needed.\n`);
  process.stdout.write(`       ${DIM("Existing docs are updated in place — nothing is ever deleted.")}\n\n`);
  process.stdout.write(`     ${DIM("Run")} /genesis ${DIM("first if there's no snapshot yet.")}\n\n`);
}

function formatError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  // Rate limit (429)
  if (message.includes("429")) {
    const retryMatch = message.match(/retry in ([\d.]+)s/i);
    const retryHint = retryMatch ? ` Try again in ${Math.ceil(Number(retryMatch[1]))}s.` : " Wait a moment and try again.";
    return `Rate limit exceeded.${retryHint}\n     ${DIM("Your provider's free tier has request limits. Consider waiting or upgrading your plan.")}`;
  }

  // Auth errors (401, 403)
  if (message.includes("401") || message.includes("403")) {
    return `Authentication failed. Check your API key with /config set key <key>`;
  }

  // Timeout / abort
  if (message.includes("abort") || message.includes("timeout") || message.includes("ETIMEDOUT")) {
    return `Request timed out. The model took too long to respond.`;
  }

  // Network errors
  if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND") || message.includes("fetch failed")) {
    return `Connection failed. Could not reach the API.\n     ${DIM("Check your internet connection and provider URL.")}`;
  }

  // Generic — show first line only
  const firstLine = message.split("\n")[0].trim();
  const short = firstLine.length > 120 ? firstLine.slice(0, 120) + "..." : firstLine;
  return short;
}
