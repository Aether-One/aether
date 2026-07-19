import chalk from "chalk";
import { readdir, rm, stat, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registry } from "./registry.js";
import { getGlobalDir, getGlobalConfigPath } from "../config/index.js";
import { ACCENT, DIM, SUCCESS, WARN } from "../ui/theme.js";

export function registerCleanCommand(): void {
  registry.register({
    name: "clean",
    description: "Remove global configs, caches, and project data",
    usage: "/clean [cache | config | all | <number>]",
    handler: async (args) => {
      const trimmedArgs = args.trim();
      const tokens = trimmedArgs.split(/\s+/).filter(Boolean);
      const sub = tokens[0]?.toLowerCase();

      if (!sub || sub === "list") {
        await showStatus();
        return;
      }

      if (sub === "--help" || sub === "-h" || sub === "help") {
        showCleanHelp();
        return;
      }

      if (sub === "cache") {
        const target = tokens[1];
        if (target) {
          const num = parseInt(target, 10);
          if (!isNaN(num)) {
            await cleanCacheByIndex(num);
            return;
          }
        }
        await cleanCache();
        return;
      }

      if (sub === "config") {
        await cleanConfig();
        return;
      }

      if (sub === "all") {
        await cleanAll();
        return;
      }

      // Try as a project number shorthand: /clean 1, /clean 2
      const num = parseInt(sub, 10);
      if (!isNaN(num)) {
        await cleanProjectByIndex(num);
        return;
      }

      process.stdout.write(`\n${chalk.red("  ✗")} Unknown option: ${trimmedArgs}\n`);
      process.stdout.write(`     ${DIM("Use /clean --help for usage info.\n\n")}`);
    },
  });
}

// ─── Help ────────────────────────────────────────────────────────────────────

function showCleanHelp(): void {
  process.stdout.write(`\n${ACCENT("  🧹 ")}${DIM("aether clean")}\n\n`);
  process.stdout.write(`     Remove global data (configs, caches, project entries).\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /clean                  ${DIM("— list all projects and global status")}\n`);
  process.stdout.write(`       /clean cache            ${DIM("— remove all cached data (keep configs)")}\n`);
  process.stdout.write(`       /clean cache <number>   ${DIM("— remove cache for a specific project")}\n`);
  process.stdout.write(`       /clean config           ${DIM("— remove global config (loses API keys)")}\n`);
  process.stdout.write(`       /clean all              ${DIM("— remove everything (~/.aether/)")}\n`);
  process.stdout.write(`       /clean <number>         ${DIM("— remove project entirely (config + cache)")}\n\n`);
  process.stdout.write(`     ${DIM("Examples:")}\n`);
  process.stdout.write(`       /clean                  ${DIM("— see what's stored")}\n`);
  process.stdout.write(`       /clean cache            ${DIM("— free all cache disk space")}\n`);
  process.stdout.write(`       /clean cache 1          ${DIM("— clear cache for project #1 only")}\n`);
  process.stdout.write(`       /clean 2                ${DIM("— remove project #2 completely")}\n\n`);
  process.stdout.write(`     ${DIM("Global directory:")} ${getGlobalDir()}\n\n`);
}

// ─── List / status ───────────────────────────────────────────────────────────

async function showStatus(): Promise<void> {
  const globalDir = getGlobalDir();

  if (!existsSync(globalDir)) {
    process.stdout.write(`\n${ACCENT("  🧹 ")}${DIM("aether clean")}\n\n`);
    process.stdout.write(`     ${DIM("Nothing to clean — no global directory found.")}\n\n`);
    return;
  }

  const totalSize = await getDirSize(globalDir);
  const projects = await listProjects();
  const cacheSize = await getCacheSize();

  process.stdout.write(`\n${ACCENT("  🧹 ")}${DIM("aether clean")}\n\n`);
  process.stdout.write(`     ${DIM("Global directory:")} ${globalDir} ${DIM(`(${formatSize(totalSize)})`)}\n\n`);

  if (projects.length > 0) {
    process.stdout.write(`     ${DIM("─── Projects ───────────────────────────────────────")}\n\n`);
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const name = extractName(p.id);
      const sizeStr = p.cacheSize > 0 ? DIM(` (cache: ${formatSize(p.cacheSize)})`) : "";
      const providerStr = p.provider ? `${p.provider}/${p.model ?? "—"}` : DIM("(inherited from default)");
      process.stdout.write(`     ${DIM(`${i + 1}.`)} ${name}${sizeStr}\n`);
      process.stdout.write(`        ${providerStr}\n`);
    }
    process.stdout.write("\n");
  } else {
    process.stdout.write(`     ${DIM("No projects found.")}\n\n`);
  }

  if (cacheSize > 0) {
    process.stdout.write(`     ${DIM("Total cache:")} ${formatSize(cacheSize)}\n\n`);
  }

  process.stdout.write(`     ${DIM("Actions:")}\n`);
  process.stdout.write(`       /clean cache            ${DIM("— clear all project caches")}\n`);
  if (projects.length > 0) {
    process.stdout.write(`       /clean cache <n>         ${DIM("— clear cache for project #n from the list above")}\n`);
    process.stdout.write(`       /clean <n>              ${DIM("— remove project #n entirely (config + cache)")}\n`);
  }
  process.stdout.write(`       /clean config           ${DIM("— delete ~/.aether/config.json (API keys)")}\n`);
  process.stdout.write(`       /clean all              ${DIM("— delete everything in ~/.aether/")}\n`);
  process.stdout.write("\n");
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function cleanCache(): Promise<void> {
  const cacheDir = join(getGlobalDir(), "cache");

  if (!existsSync(cacheDir)) {
    process.stdout.write(`\n${SUCCESS("  ✓")} ${DIM("No cache to clean.")}\n\n`);
    return;
  }

  const size = await getDirSize(cacheDir);
  await rm(cacheDir, { recursive: true, force: true });
  process.stdout.write(`\n${SUCCESS("  ✓")} Cache removed ${DIM(`(freed ${formatSize(size)})`)}\n\n`);
}

async function cleanCacheByIndex(index: number): Promise<void> {
  const projects = await listProjects();

  if (index < 1 || index > projects.length) {
    process.stdout.write(`\n${chalk.red("  ✗")} Invalid project number: ${index}\n`);
    if (projects.length > 0) {
      process.stdout.write(`     ${DIM(`Valid range: 1-${projects.length}. Use /clean to see the list.`)}\n\n`);
    } else {
      process.stdout.write(`     ${DIM("No projects found. Use /clean to see status.")}\n\n`);
    }
    return;
  }

  const project = projects[index - 1];
  const cacheDir = join(getGlobalDir(), "cache", project.id);

  if (!existsSync(cacheDir)) {
    process.stdout.write(`\n${SUCCESS("  ✓")} ${DIM(`No cache for ${extractName(project.id)}.`)}\n\n`);
    return;
  }

  const size = await getDirSize(cacheDir);
  await rm(cacheDir, { recursive: true, force: true });
  process.stdout.write(`\n${SUCCESS("  ✓")} Cache for ${extractName(project.id)} removed ${DIM(`(freed ${formatSize(size)})`)}\n\n`);
}

async function cleanConfig(): Promise<void> {
  const configPath = getGlobalConfigPath();

  if (!existsSync(configPath)) {
    process.stdout.write(`\n${SUCCESS("  ✓")} ${DIM("No config file found.")}\n\n`);
    return;
  }

  await rm(configPath, { force: true });
  process.stdout.write(`\n${SUCCESS("  ✓")} Config removed ${DIM(`(${configPath})`)}\n`);
  process.stdout.write(`     ${WARN("⚠")} ${DIM("API keys and project configs are gone. Run /config to set up again.")}\n\n`);
}

async function cleanAll(): Promise<void> {
  const globalDir = getGlobalDir();

  if (!existsSync(globalDir)) {
    process.stdout.write(`\n${SUCCESS("  ✓")} ${DIM("Nothing to clean — no global directory found.")}\n\n`);
    return;
  }

  const size = await getDirSize(globalDir);
  await rm(globalDir, { recursive: true, force: true });
  process.stdout.write(`\n${SUCCESS("  ✓")} Removed ${globalDir} ${DIM(`(freed ${formatSize(size)})`)}\n`);
  process.stdout.write(`     ${WARN("⚠")} ${DIM("Everything is gone — configs, caches, all project data.")}\n\n`);
}

async function cleanProjectByIndex(index: number): Promise<void> {
  const projects = await listProjects();

  if (index < 1 || index > projects.length) {
    process.stdout.write(`\n${chalk.red("  ✗")} Invalid project number: ${index}\n`);
    if (projects.length > 0) {
      process.stdout.write(`     ${DIM(`Valid range: 1-${projects.length}. Use /clean to see the list.`)}\n\n`);
    } else {
      process.stdout.write(`     ${DIM("No projects found. Use /clean to see status.")}\n\n`);
    }
    return;
  }

  await removeProjects([projects[index - 1]]);
}

async function removeProjects(projects: ProjectEntry[]): Promise<void> {
  const globalDir = getGlobalDir();
  const configPath = getGlobalConfigPath();

  // Remove from config.json
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(await readFile(configPath, "utf-8"));
      const projectsMap: Record<string, unknown> = raw.projects ?? {};
      for (const p of projects) {
        delete projectsMap[p.id];
      }
      raw.projects = projectsMap;
      await writeFile(configPath, JSON.stringify(raw, null, 2), "utf-8");
    } catch {
      /* best-effort */
    }
  }

  // Remove cache dirs
  for (const p of projects) {
    const cacheDir = join(globalDir, "cache", p.id);
    if (existsSync(cacheDir)) {
      await rm(cacheDir, { recursive: true, force: true });
    }
  }

  const names = projects.map((p) => extractName(p.id)).join(", ");
  process.stdout.write(`\n${SUCCESS("  ✓")} Removed: ${names}\n\n`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ProjectEntry {
  id: string;
  provider?: string;
  model?: string;
  cacheSize: number;
}

/** Strip the trailing -<12-char-hex> hash from the project ID to show a readable name. */
function extractName(id: string): string {
  return id.replace(/-[a-f0-9]{12}$/, "");
}

async function listProjects(): Promise<ProjectEntry[]> {
  const configPath = getGlobalConfigPath();
  const cacheBase = join(getGlobalDir(), "cache");
  const seen = new Set<string>();
  const entries: ProjectEntry[] = [];

  let defaultConfig: { provider?: string; model?: string } | null = null;

  // From config.json
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(await readFile(configPath, "utf-8"));
      defaultConfig = raw.default ?? null;
      const projectsMap: Record<string, { provider?: string; model?: string }> = raw.projects ?? {};

      for (const [id, config] of Object.entries(projectsMap)) {
        seen.add(id);
        const cacheDir = join(cacheBase, id);
        const cacheSize = existsSync(cacheDir) ? await getDirSize(cacheDir) : 0;
        entries.push({
          id,
          provider: config.provider ?? defaultConfig?.provider,
          model: config.model ?? defaultConfig?.model,
          cacheSize,
        });
      }
    } catch {
      /* ignore */
    }
  }

  // From cache directories (projects that exist on disk but not in config)
  if (existsSync(cacheBase)) {
    try {
      const dirs = await readdir(cacheBase, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory() && !seen.has(dir.name)) {
          seen.add(dir.name);
          const cacheDir = join(cacheBase, dir.name);
          const cacheSize = await getDirSize(cacheDir);
          entries.push({
            id: dir.name,
            provider: defaultConfig?.provider,
            model: defaultConfig?.model,
            cacheSize,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  return entries;
}

async function getCacheSize(): Promise<number> {
  const cacheDir = join(getGlobalDir(), "cache");
  if (!existsSync(cacheDir)) return 0;
  return getDirSize(cacheDir);
}

async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirSize(fullPath);
      } else {
        const s = await stat(fullPath);
        total += s.size;
      }
    }
  } catch {
    /* ignore unreadable dirs */
  }
  return total;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
