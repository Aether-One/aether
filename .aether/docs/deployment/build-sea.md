# Single Executable Build

## Overview

The project defines an npm script `build:sea` that runs `node scripts/build-sea.mjs` (see `package.json` `scripts` field). The stated purpose of this build is to package the CLI into a single executable using `esbuild` and `postject`, as described in the custom document focus.

## Verifiable Configuration

The following entries exist in `package.json`:

| Field | Value | Source |
|-------|-------|--------|
| `scripts.build:sea` | `node scripts/build-sea.mjs` | `package.json` |
| `devDependencies.esbuild` | `^0.28.1` | `package.json` |
| `devDependencies.postject` | `^1.0.0-alpha.6` | `package.json` |
| `bin.aether` | `./dist/cli/index.js` | `package.json` |

A file `sea-config.json` is present in the project root per the directory structure, but its contents are **not provided** in the project context.

A file `scripts/build-sea.mjs` is present per the directory structure, but its source code is **not provided** in the project context. Therefore, the exact steps performed by that script cannot be documented.

## What Cannot Be Confirmed

- The internal logic of `scripts/build-sea.mjs` (not shown in context).
- The contents of `sea-config.json` (not shown in context).
- How `esbuild` and `postject` are invoked or ordered within the build (not shown in context).

## Summary

Based only on the provided context: the `build:sea` npm script exists and invokes `scripts/build-sea.mjs`; `esbuild` and `postject` are declared as dev dependencies; and a `sea-config.json` file exists at root. No further implementation details are verifiable from the provided code.