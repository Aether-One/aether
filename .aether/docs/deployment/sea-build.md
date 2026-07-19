# Single Executable Application Build

## Overview

The project includes a build script for creating a Single Executable Application (SEA) using **esbuild** and **postject**, enabling distribution as a standalone binary without requiring a Node.js runtime.

## Verified Configuration

### Package Configuration (`package.json`)

| Property | Value |
|----------|-------|
| Build script | `"build:sea": "node scripts/build-sea.mjs"` |
| Runtime dependency | `chalk@^5.4.1` |
| Build dependencies | `esbuild@^0.28.1`, `postject@^1.0.0-alpha.6` |
| Node.js requirement | `>=20.0.0` |
| Entry point (bin) | `./dist/cli/index.js` → `aether` |

### Build Artifacts (from directory structure)

| File | Purpose |
|------|---------|
| `scripts/build-sea.mjs` | SEA build script (invoked via `npm run build:sea`) |
| `sea-config.json` | SEA configuration (referenced by build script) |
| `dist/cli/index.js` | Compiled CLI entry point (output of `tsc`) |

## Build Process (Verified from `package.json`)

```bash
# 1. Compile TypeScript
npm run build          # Runs: tsc

# 2. Build Single Executable Application
npm run build:sea      # Runs: node scripts/build-sea.mjs
```

## Technology Stack (Verified from `package.json`)

| Tool | Version | Role |
|------|---------|------|
| **esbuild** | `^0.28.1` | Bundles compiled JS into a single file |
| **postject** | `^1.0.0-alpha.6` | Injects bundle into Node.js binary to create SEA |
| **Node.js** | `>=20.0.0` | Required for SEA creation (Node 20+ supports `node --experimental-sea-config`) |

## What Is Not Documented

The following files exist in the repository (per directory structure) but **their contents were not provided in the context**, so their exact configuration cannot be documented:

- `scripts/build-sea.mjs` — SEA build script implementation
- `sea-config.json` — SEA configuration (input to `node --experimental-sea-config`)

> **Note**: Per project rules, only explicitly provided file contents are documented. The above files are confirmed to exist but their implementation details are not verifiable from the given context.