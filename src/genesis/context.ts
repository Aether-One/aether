import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import type { ProjectContext } from "./types.js";
import { MAX_FILE_SIZE, MAX_TOTAL_CHARS, MAX_FILES_WALKED, MAX_WALK_DEPTH } from "./constants.js";
import { loadExcludes, isExcluded } from "./exclude.js";

const rel = (rootDir: string, path: string): string => relative(rootDir, path).replace(/\\/g, "/");

export type { ProjectContext } from "./types.js";

// Config files that reveal project identity
const CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "Gemfile",
  "pom.xml",
  "docker-compose.yml",
  "Dockerfile",
  ".env.example",
  "README.md",
];

// Author-written docs that carry product intent (why, roadmap, decisions) —
// not just facts an AI could re-derive by reading the code.
const VISION_FILE_CANDIDATES = ["CONTEXT.md", "CONTRIBUTING.md", "ARCHITECTURE.md", "VISION.md"];

// Directories to skip
const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt",
  ".cache", "coverage", "target", ".aether", "__pycache__", ".venv",
  "venv", "vendor", ".turbo", ".vercel",
]);

// Extensions that are source code
const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java",
  ".kt", ".rb", ".ex", ".exs", ".php", ".swift", ".vue", ".svelte",
]);

// Relative dir paths under the project (skipping ignored/dot/already-excluded dirs) —
// the candidate list for the interactive /exclude picker.
export async function collectDirectories(rootDir: string, excludes: string[], maxDepth = 6): Promise<string[]> {
  const dirs: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      const relPath = rel(rootDir, full);
      if (isExcluded(relPath, excludes)) continue;
      dirs.push(relPath);
      await walk(full, depth + 1);
    }
  }

  await walk(rootDir, 0);
  return dirs.sort();
}

export async function collectSourceFiles(rootDir: string, excludes: string[], maxDepth = 6): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const relPath = rel(rootDir, full);
      if (isExcluded(relPath, excludes)) continue;

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        await walk(full, depth + 1);
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(relPath);
      }
    }
  }

  await walk(rootDir, 0);
  return files.sort();
}

export async function scanContext(rootDir: string): Promise<ProjectContext> {
  const context: ProjectContext = {
    name: basename(rootDir),
    rootDir,
    configFiles: [],
    visionFiles: [],
    entryPoints: [],
    sourceFiles: [],
    directoryTree: "",
    omittedFiles: [],
  };

  const excludes = await loadExcludes(rootDir);

  // 1. Read config files
  for (const file of CONFIG_FILES) {
    if (isExcluded(file, excludes)) continue;
    const filePath = join(rootDir, file);
    if (!existsSync(filePath)) continue;

    const content = await safeReadFile(filePath, file, context.omittedFiles);
    if (content) {
      context.configFiles.push({ path: file, content });

      // Extract name/description from package.json
      if (file === "package.json") {
        try {
          const pkg = JSON.parse(content);
          context.name = pkg.name || context.name;
          context.description = pkg.description;
        } catch { /* skip */ }
      }
    }
  }

  // 2. Read vision/intent docs (CONTEXT.md, CONTRIBUTING.md, docs/*.md, ...)
  for (const file of await findVisionFiles(rootDir, excludes)) {
    const content = await safeReadFile(join(rootDir, file), file, context.omittedFiles);
    if (content) {
      context.visionFiles.push({ path: file, content });
    }
  }

  // 3. Build directory tree
  context.directoryTree = await buildDirectoryTree(rootDir, MAX_WALK_DEPTH, excludes);

  // 4. Find and read entry points
  for (const file of await findEntryPoints(rootDir, excludes)) {
    const content = await safeReadFile(join(rootDir, file), file, context.omittedFiles);
    if (content) {
      context.entryPoints.push({ path: file, content });
    }
  }

  // 5. Read source files — ALL of them, ranked by importance, within the total char budget.
  //    No fixed file-count cap: a project with 30 small files should not lose 20 of them
  //    to an arbitrary top-10 limit while sitting well under the char budget.
  const rankedSourceFiles = await findSourceFiles(rootDir, context.omittedFiles, excludes);
  let totalChars = context.configFiles.reduce((sum, f) => sum + f.content.length, 0)
    + context.visionFiles.reduce((sum, f) => sum + f.content.length, 0)
    + context.entryPoints.reduce((sum, f) => sum + f.content.length, 0);

  for (const file of rankedSourceFiles) {
    if (context.entryPoints.some((ep) => ep.path === file)) continue;

    if (totalChars >= MAX_TOTAL_CHARS) {
      context.omittedFiles.push(`${file} (project context budget exceeded)`);
      continue;
    }

    const content = await safeReadFile(join(rootDir, file), file, context.omittedFiles);
    if (content) {
      totalChars += content.length;
      context.sourceFiles.push({ path: file, content });
    }
  }

  return context;
}

export function buildPrompt(context: ProjectContext): string {
  const parts: string[] = [];

  parts.push(`# PROJECT CONTEXT — THIS IS THE COMPLETE PROJECT`);
  parts.push("");
  parts.push(`Project name: ${context.name}`);
  if (context.description) {
    parts.push(`Description: ${context.description}`);
  }
  parts.push("");
  parts.push(`IMPORTANT: The information below is EVERYTHING that exists in this project.`);
  parts.push(`If something is NOT listed here, it DOES NOT EXIST. Do not invent anything.`);
  parts.push("");

  // Directory structure
  parts.push("## Directory Structure (complete)");
  parts.push("```");
  parts.push(context.directoryTree);
  parts.push("```");
  parts.push("");

  // Vision / intent docs — kept separate and clearly labeled so the model never
  // confuses "what the team wants to build" with "what is actually implemented".
  if (context.visionFiles.length > 0) {
    parts.push("## Product Vision (author-written — describes INTENT, not necessarily current reality)");
    parts.push(`These files were written by the project's own team to explain WHY the project exists, its design decisions, and where it's headed. They may describe a roadmap, TODOs, or planned features that are NOT YET built. Use them to understand intent and motivation — but only describe something as IMPLEMENTED if it is also verifiable in the code below.`);
    parts.push("");
    for (const file of context.visionFiles) {
      parts.push(`### ${file.path}`);
      parts.push("```");
      parts.push(file.content);
      parts.push("```");
      parts.push("");
    }
  }

  // Config files
  if (context.configFiles.length > 0) {
    parts.push("## Configuration Files");
    for (const file of context.configFiles) {
      parts.push(`### ${file.path}`);
      parts.push("```");
      parts.push(file.content);
      parts.push("```");
      parts.push("");
    }
  }

  // Entry points
  if (context.entryPoints.length > 0) {
    parts.push("## Entry Points");
    for (const file of context.entryPoints) {
      parts.push(`### ${file.path}`);
      parts.push("```");
      parts.push(file.content);
      parts.push("```");
      parts.push("");
    }
  }

  // Source files
  if (context.sourceFiles.length > 0) {
    parts.push("## Key Source Files");
    for (const file of context.sourceFiles) {
      parts.push(`### ${file.path}`);
      parts.push("```");
      parts.push(file.content);
      parts.push("```");
      parts.push("");
    }
  }

  // Omitted files — reported explicitly, never dropped silently.
  if (context.omittedFiles.length > 0) {
    parts.push("## Omitted From Context (size/budget limits)");
    parts.push(`These exist in the project but their contents were too large to include. Do NOT describe their internals — you may only note that they exist.`);
    for (const note of context.omittedFiles) {
      parts.push(`- ${note}`);
    }
    parts.push("");
  }

  parts.push("---");
  parts.push("");
  parts.push("REMINDER: The above is the ENTIRE project (except what is explicitly listed as omitted). Only reference files, functions, and technologies that appear above. If you cannot find evidence for something, do NOT mention it.");

  return parts.join("\n");
}

// --- Helpers ---

async function safeReadFile(filePath: string, label: string, omitted: string[]): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      omitted.push(`${label} (${Math.round(stats.size / 1024)}KB, exceeds per-file limit)`);
      return null;
    }
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function buildDirectoryTree(rootDir: string, maxDepth: number, excludes: string[]): Promise<string> {
  const lines: string[] = [];

  async function walk(dir: string, prefix: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // Sort: dirs first, then files
    const sorted = entries
      .filter((e) => !IGNORED_DIRS.has(e.name) && !e.name.startsWith(".") && !isExcluded(rel(rootDir, join(dir, e.name)), excludes))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const nextPrefix = prefix + (isLast ? "    " : "│   ");

      if (entry.isDirectory()) {
        lines.push(`${prefix}${connector}${entry.name}/`);
        await walk(join(dir, entry.name), nextPrefix, depth + 1);
      } else {
        lines.push(`${prefix}${connector}${entry.name}`);
      }
    }
  }

  lines.push(`${basename(rootDir)}/`);
  await walk(rootDir, "", 0);
  return lines.join("\n");
}

async function findVisionFiles(rootDir: string, excludes: string[]): Promise<string[]> {
  const found: string[] = [];

  for (const candidate of VISION_FILE_CANDIDATES) {
    if (isExcluded(candidate, excludes)) continue;
    if (existsSync(join(rootDir, candidate))) {
      found.push(candidate);
    }
  }

  const docsDir = join(rootDir, "docs");
  if (existsSync(docsDir) && !isExcluded("docs", excludes)) {
    try {
      const entries = await readdir(docsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !isExcluded(`docs/${entry.name}`, excludes)) {
          found.push(`docs/${entry.name}`);
        }
      }
    } catch { /* skip */ }
  }

  return found;
}

async function findEntryPoints(rootDir: string, excludes: string[]): Promise<string[]> {
  const candidates = [
    "src/index.ts", "src/index.js", "src/main.ts", "src/main.js",
    "src/app.ts", "src/app.js", "src/server.ts", "src/server.js",
    "src/cli/index.ts", "src/cli.ts", "index.ts", "index.js",
    "main.ts", "main.js", "app.ts", "app.js",
    "cmd/main.go", "main.go", "src/main.rs", "lib.rs",
    "manage.py", "app.py", "main.py",
  ];

  const found: string[] = [];
  for (const candidate of candidates) {
    if (isExcluded(candidate, excludes)) continue;
    if (existsSync(join(rootDir, candidate))) {
      found.push(candidate);
    }
  }
  return found;
}

/**
 * Walks the whole source tree and returns every matching source file,
 * ranked by importance (most important first). Callers decide how many
 * fit inside the char budget — this function does not truncate itself,
 * beyond the MAX_FILES_WALKED safety ceiling for pathological repos.
 */
async function findSourceFiles(rootDir: string, omitted: string[], excludes: string[]): Promise<string[]> {
  const files: Array<{ path: string; size: number }> = [];
  let walkTruncated = false;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_WALK_DEPTH) return;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES_WALKED) {
        walkTruncated = true;
        return;
      }

      const filePath = join(dir, entry.name);
      if (isExcluded(rel(rootDir, filePath), excludes)) continue;

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        await walk(filePath, depth + 1);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (!SOURCE_EXTENSIONS.has(ext)) continue;

        try {
          const stats = await stat(filePath);
          files.push({ path: relative(rootDir, filePath), size: stats.size });
        } catch {
          continue;
        }
      }
    }
  }

  await walk(rootDir, 0);

  if (walkTruncated) {
    omitted.push(`(project has more than ${MAX_FILES_WALKED} source files — file walk stopped early)`);
  }

  files.sort((a, b) => getImportanceScore(b.path, b.size) - getImportanceScore(a.path, a.size));
  return files.map((f) => f.path);
}

function getImportanceScore(filePath: string, size: number): number {
  let score = 0;
  const name = basename(filePath).toLowerCase();

  // Important file names
  if (name.includes("index") || name.includes("main") || name.includes("app")) score += 10;
  if (name.includes("server") || name.includes("router") || name.includes("routes")) score += 8;
  if (name.includes("config") || name.includes("setup")) score += 5;
  if (name.includes("types") || name.includes("schema")) score += 5;

  // Shallow depth = more important
  const depth = filePath.split(/[/\\]/).length;
  score += Math.max(0, 6 - depth) * 2;

  // Sweet spot for file size (not too small, not too large)
  if (size > 500 && size < 5000) score += 5;
  if (size > 200) score += 2;

  return score;
}
