import { existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { registry } from "./registry.js";
import { loadConfig } from "../config/index.js";
import { createProvider } from "../providers/factory.js";
import type { PingResult } from "../providers/types.js";
import { formatRetryLine } from "../providers/retry.js";
import { scanContext } from "../genesis/context.js";
import { getModelPricing } from "../pricing/index.js";
import { estimateCleanCode } from "../genesis/estimate.js";
import {
  filterIgnored,
  scanCleanCodeHeuristics,
  flaggedFiles,
  scanCleanCodeHybrid,
  buildCleanCodeReport,
  buildCleanCodeMarkdown,
  writeCleanCodeMarkdown,
  cleanCodeMarkdownRelPath,
  loadCleanCodeIgnore,
  addCleanCodeIgnorePattern,
  loadCleanCodeParadigm,
  setCleanCodeParadigm,
  isCleanCodeParadigm,
} from "../genesis/cleancode.js";
import { paradigmLabel, listParadigms } from "../prompts/index.js";
import { formatEstimate } from "../ui/cost.js";
import { promptConfirm } from "../ui/confirm.js";
import { LineSpinner } from "../ui/steps.js";
import { ACCENT, DIM, SUCCESS, WARN, ERROR } from "../ui/theme.js";

export function registerCleanCodeCommand(): void {
  registry.register({
    name: "cleancode",
    description: "Scan the project for clean code violations and write a report",
    usage: "/cleancode <review|ignore|paradigm> [args]",
    handler: async (args) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const sub = tokens[0]?.toLowerCase();
      const rest = tokens.slice(1).join(" ");

      switch (sub) {
        case "review":
          await runReview(rest);
          return;
        case "ignore":
          await manageIgnore(rest);
          return;
        case "paradigm":
          await manageParadigm(rest);
          return;
        default:
          showCleanCodeHelp();
          return;
      }
    },
  });
}

function showCleanCodeHelp(): void {
  process.stdout.write(`\n${ACCENT("  🧼 ")}${DIM("aether cleancode")}\n\n`);
  process.stdout.write(`     Scan the project for clean code violations and write ${cleanCodeMarkdownRelPath()} —\n`);
  process.stdout.write(`     point your AI assistant at it to apply the fixes.\n\n`);
  process.stdout.write(`     ${DIM("Detection is hybrid: local heuristics flag suspect files for free, then, if")}\n`);
  process.stdout.write(`     ${DIM("a provider is configured, ONE batched AI call re-reviews just those files.")}\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /cleancode review [path|file]   ${DIM("— scan and write the report")}\n`);
  process.stdout.write(`       /cleancode review --yes         ${DIM("— skip the cost confirmation")}\n`);
  process.stdout.write(`       /cleancode ignore [pattern]     ${DIM("— list or add an ignore glob")}\n`);
  process.stdout.write(`       /cleancode paradigm [name]      ${DIM("— show or set which principles to follow")}\n\n`);
  process.stdout.write(`     ${DIM("Examples:")}\n`);
  process.stdout.write(`       /cleancode review                ${DIM("— scan the whole project")}\n`);
  process.stdout.write(`       /cleancode review src/index.ts   ${DIM("— scan a single file")}\n`);
  process.stdout.write(`       /cleancode ignore "**/*.gen.ts"  ${DIM("— skip generated files")}\n`);
  process.stdout.write(`       /cleancode paradigm solid        ${DIM("— review against SOLID instead")}\n\n`);
  process.stdout.write(`     ${DIM("Paradigms available:")}\n`);
  for (const p of listParadigms()) {
    process.stdout.write(`       ${DIM("•")} ${p.id.padEnd(14)} ${DIM(p.label)}\n`);
  }
  process.stdout.write("\n");
}

function resolveTarget(rawArg: string): { targetDir: string; singleFile: string | null } | null {
  const trimmed = rawArg.trim();
  if (!trimmed) return { targetDir: process.cwd(), singleFile: null };

  const abs = join(process.cwd(), trimmed);
  if (!existsSync(abs)) return null;

  if (statSync(abs).isFile()) {
    return { targetDir: process.cwd(), singleFile: relative(process.cwd(), abs) };
  }
  return { targetDir: abs, singleFile: null };
}

async function runReview(rawArg: string): Promise<void> {
  const tokens = rawArg.trim().split(/\s+/).filter(Boolean);
  const skipConfirm = tokens.includes("--yes") || tokens.includes("-y");
  const flags = new Set(["--yes", "-y"]);
  const pathArg = tokens.filter((t) => !flags.has(t)).join(" ");

  const resolved = resolveTarget(pathArg);
  if (!resolved) {
    process.stdout.write(`\n${ERROR("  ✗")} Path not found: ${pathArg}\n\n`);
    return;
  }
  const { targetDir, singleFile } = resolved;
  const paradigm = await loadCleanCodeParadigm(targetDir);

  process.stdout.write(`\n${ACCENT("  🧼 ")}${DIM("aether cleancode review")} ${DIM(`(${paradigmLabel(paradigm)})`)}\n\n`);

  const context = await scanContext(targetDir);

  let filesToReview = context.sourceFiles;
  if (singleFile) {
    filesToReview = filesToReview.filter((f) => f.path === singleFile);
    if (filesToReview.length === 0) {
      process.stdout.write(`${ERROR("  ✗")} ${singleFile} is not a source file Aether can scan.\n\n`);
      return;
    }
  } else {
    const ignore = await loadCleanCodeIgnore(targetDir);
    filesToReview = filterIgnored(filesToReview, ignore);
  }

  if (filesToReview.length === 0) {
    process.stdout.write(`     ${WARN("!")} No source files to review.\n\n`);
    return;
  }

  const config = await loadConfig(process.cwd());
  let provider = null as ReturnType<typeof createProvider> | null;
  let providerLabel = { provider: "none", model: "heuristics" };

  if (config) {
    const candidate = createProvider(config);
    if ((await candidate.ping()).ok) {
      provider = candidate;
      providerLabel = { provider: config.provider, model: config.model };
    }
  }

  const heuristicIssues = scanCleanCodeHeuristics(filesToReview, paradigm);
  const toReview = provider ? flaggedFiles(filesToReview, heuristicIssues) : [];

  if (!provider) {
    process.stdout.write(
      `     ${WARN("!")} ${DIM("No AI provider configured or reachable — using heuristics only.")}\n` +
        `       ${DIM("Run")} /config ${DIM("for a sharper review.")}\n\n`,
    );
  } else if (toReview.length > 0) {
    const pricing = await getModelPricing(config!);
    const estimate = estimateCleanCode(toReview, pricing);
    process.stdout.write(formatEstimate(providerLabel, estimate, `AI pass on ${toReview.length} flagged file${toReview.length === 1 ? "" : "s"}`));

    if (!skipConfirm) {
      const proceed = await promptConfirm(`     ${DIM("Proceed?")} ${ACCENT("[Y/n]")} `);
      if (!proceed) {
        process.stdout.write(`     ${DIM("Cancelled — no AI pass. Using heuristic findings instead.")}\n\n`);
        provider = null;
      }
    }
  }

  let result: { issues: typeof heuristicIssues; aiReviewedFiles: number };
  if (!provider || toReview.length === 0) {
    result = { issues: heuristicIssues, aiReviewedFiles: 0 };
  } else {
    const spinner = new LineSpinner("Reviewing flagged files with AI...");
    spinner.start();
    try {
      result = await scanCleanCodeHybrid(filesToReview, paradigm, provider, config?.model, {
        onRetry: (attempt, maxRetries, error) => spinner.log(formatRetryLine(attempt, maxRetries, error)),
      });
      spinner.succeed();
    } catch (err) {
      spinner.fail();
      process.stdout.write(`${ERROR("  ✗")} ${formatError(err)}\n\n`);
      return;
    }
  }

  const detection = result.aiReviewedFiles > 0 ? "hybrid" : "heuristic";
  const report = buildCleanCodeReport(providerLabel, result.issues, paradigm, detection);
  await writeCleanCodeMarkdown(targetDir, buildCleanCodeMarkdown(report));

  printSummary(result.issues, cleanCodeMarkdownRelPath());
}

function printSummary(issues: { severity: "high" | "medium" | "low" }[], reportRelPath: string): void {
  if (issues.length === 0) {
    process.stdout.write(`     ${SUCCESS("✓")} No clean code violations found. Nice work.\n\n`);
    return;
  }

  const counts = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) counts[issue.severity]++;

  process.stdout.write(
    `     ${SUCCESS("✓")} ${issues.length} issue${issues.length === 1 ? "" : "s"} found — ` +
      `${ERROR(`${counts.high} high`)}, ${WARN(`${counts.medium} medium`)}, ${DIM(`${counts.low} low`)}\n`,
  );
  process.stdout.write(`     ${DIM("Wrote")} ${ACCENT(reportRelPath)} ${DIM("— point your AI assistant at it to apply the fixes.")}\n\n`);
}

async function manageIgnore(rawArg: string): Promise<void> {
  const targetDir = process.cwd();
  const pattern = rawArg.trim().replace(/^["']|["']$/g, "");

  if (!pattern) {
    const patterns = await loadCleanCodeIgnore(targetDir);
    process.stdout.write(`\n${ACCENT("  🧼 ")}${DIM("aether cleancode ignore")}\n\n`);
    if (patterns.length === 0) {
      process.stdout.write(`     ${DIM("No ignore patterns set.")}\n\n`);
    } else {
      for (const p of patterns) process.stdout.write(`     ${DIM("•")} ${p}\n`);
      process.stdout.write("\n");
    }
    process.stdout.write(`     ${DIM('Usage: /cleancode ignore "**/*.generated.ts"')}\n\n`);
    return;
  }

  const patterns = await addCleanCodeIgnorePattern(targetDir, pattern);
  process.stdout.write(`\n${SUCCESS("  ✓")} Added ignore pattern: ${pattern} ${DIM(`(${patterns.length} total)`)}\n\n`);
}

async function manageParadigm(rawArg: string): Promise<void> {
  const targetDir = process.cwd();
  const requested = rawArg.trim().toLowerCase();

  if (!requested) {
    const current = await loadCleanCodeParadigm(targetDir);
    process.stdout.write(`\n${ACCENT("  🧼 ")}${DIM("aether cleancode paradigm")}\n\n`);
    process.stdout.write(`     ${DIM("Current:")} ${ACCENT(current)} ${DIM(`— ${paradigmLabel(current)}`)}\n\n`);
    process.stdout.write(`     ${DIM("Available:")}\n`);
    for (const p of listParadigms()) {
      const marker = p.id === current ? SUCCESS("●") : DIM("○");
      process.stdout.write(`       ${marker} ${p.id.padEnd(14)} ${DIM(p.label)}\n`);
    }
    process.stdout.write(`\n     ${DIM("Usage: /cleancode paradigm <name>")}\n\n`);
    return;
  }

  if (!isCleanCodeParadigm(requested)) {
    process.stdout.write(`\n${ERROR("  ✗")} Unknown paradigm: ${requested}\n`);
    process.stdout.write(`     ${DIM("Available:")} ${listParadigms().map((p) => p.id).join(", ")}\n\n`);
    return;
  }

  await setCleanCodeParadigm(targetDir, requested);
  process.stdout.write(`\n${SUCCESS("  ✓")} Paradigm set to ${ACCENT(requested)} ${DIM(`— ${paradigmLabel(requested)}`)}\n`);
  process.stdout.write(`     ${DIM("Run")} /cleancode review ${DIM("to review against it.")}\n\n`);
}

function formatError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const firstLine = message.split("\n")[0].trim();
  return firstLine.length > 120 ? firstLine.slice(0, 120) + "..." : firstLine;
}
