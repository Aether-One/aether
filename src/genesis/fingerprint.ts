import { createHash } from "node:crypto";
import { execFileSync, type ExecFileSyncOptions } from "node:child_process";
import type { ProjectContext, FileFingerprint, GitInfo } from "./types.js";

export type { FileFingerprint, GitInfo } from "./types.js";

/** sha256 of every file that fed the context, keyed by forward-slashed path. */
export function buildFingerprint(context: ProjectContext): Record<string, FileFingerprint> {
  const out: Record<string, FileFingerprint> = {};
  const groups = [context.configFiles, context.visionFiles, context.entryPoints, context.sourceFiles];

  for (const group of groups) {
    for (const file of group) {
      out[file.path.replace(/\\/g, "/")] = {
        hash: createHash("sha256").update(file.content).digest("hex"),
        size: Buffer.byteLength(file.content, "utf8"),
      };
    }
  }

  return out;
}

const gitOptions = (rootDir: string): ExecFileSyncOptions => ({
  cwd: rootDir,
  stdio: ["ignore", "pipe", "ignore"],
});

/** Current git state, or null if not a git repo / git unavailable. */
export function getGitInfo(rootDir: string): GitInfo | null {
  const run = (args: string[]) => execFileSync("git", args, gitOptions(rootDir)).toString().trim();
  try {
    run(["rev-parse", "--is-inside-work-tree"]);
    return {
      commit: run(["rev-parse", "HEAD"]),
      branch: run(["rev-parse", "--abbrev-ref", "HEAD"]),
      dirty: run(["status", "--porcelain"]).length > 0,
    };
  } catch {
    return null;
  }
}

/** Commit subjects between `sinceCommit` and HEAD — the "why" behind changes. */
export function getGitLog(rootDir: string, sinceCommit: string): string | null {
  try {
    const out = execFileSync(
      "git",
      ["log", `${sinceCommit}..HEAD`, "--oneline", "--no-decorate"],
      gitOptions(rootDir),
    )
      .toString()
      .trim();
    return out || null;
  } catch {
    return null;
  }
}
