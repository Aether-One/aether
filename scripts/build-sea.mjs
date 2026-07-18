#!/usr/bin/env node

/**
 * Build script for Aether CLI Single Executable Application (SEA).
 *
 * Steps:
 * 1. Bundle all source + dependencies into a single CJS file (esbuild)
 * 2. Generate the SEA preparation blob (node --experimental-sea-config)
 * 3. Copy the node binary and inject the blob (postject)
 *
 * Usage: node scripts/build-sea.mjs
 *
 * Environment:
 *   AETHER_TARGET_OS — override platform (win32, darwin, linux)
 *   Defaults to current platform.
 */

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST_SEA = resolve(ROOT, "dist", "sea");

// Detect platform
const platform = process.env.AETHER_TARGET_OS || process.platform;

function getBinaryName() {
  switch (platform) {
    case "win32":  return "aether-win-x64.exe";
    case "darwin": return "aether-macos-x64";
    case "linux":  return "aether-linux-x64";
    default:       return `aether-${platform}-x64`;
  }
}

const BUNDLE_PATH = resolve(DIST_SEA, "aether.bundle.cjs");
const BLOB_PATH = resolve(DIST_SEA, "sea-prep.blob");
const OUTPUT_BIN = resolve(DIST_SEA, getBinaryName());

// Read version from package.json
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
const VERSION = pkg.version;

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function step(msg) {
  console.log(`\n→ ${msg}`);
}

// ──────────────────────────────────────────────────────────────
step(`Building Aether CLI v${VERSION} — ${platform} (SEA)`);
// ──────────────────────────────────────────────────────────────

// Ensure output dir
mkdirSync(DIST_SEA, { recursive: true });

// Step 1: Bundle with esbuild
step("Bundling with esbuild...");
run([
  "npx esbuild src/cli/index.ts",
  "--bundle",
  "--platform=node",
  "--target=node20",
  "--format=cjs",
  `--define:__AETHER_VERSION__='"${VERSION}"'`,
  `--outfile=${BUNDLE_PATH}`,
  `--banner:js="/* Aether CLI v${VERSION} */"`,
].join(" "));

// Step 2: Generate SEA blob
step("Generating SEA blob...");
run("node --experimental-sea-config sea-config.json");

// Step 3: Copy node binary
step("Copying Node.js binary...");
const nodePath = process.execPath;
copyFileSync(nodePath, OUTPUT_BIN);

// Step 4: Inject blob
step("Injecting SEA blob into binary...");

if (platform === "darwin") {
  // macOS: remove code signature, inject, re-sign
  run(`codesign --remove-signature "${OUTPUT_BIN}"`);
  run(`npx postject "${OUTPUT_BIN}" NODE_SEA_BLOB "${BLOB_PATH}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);
  run(`codesign --sign - "${OUTPUT_BIN}"`);
} else {
  run(`npx postject "${OUTPUT_BIN}" NODE_SEA_BLOB "${BLOB_PATH}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite`);
}

// Step 5: Make executable (unix)
if (platform !== "win32") {
  const { chmodSync } = await import("node:fs");
  chmodSync(OUTPUT_BIN, 0o755);
}

// Done
step("Done! ✓");
console.log(`\n  Binary: ${OUTPUT_BIN}`);
console.log(`  Size:   ${(readFileSync(OUTPUT_BIN).length / 1024 / 1024).toFixed(1)} MB\n`);
