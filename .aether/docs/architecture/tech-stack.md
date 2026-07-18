# Tech Stack

## Languages
- **TypeScript** — The entire `src/` tree is written in `.ts` files (e.g. `src/cli/index.ts`, `src/config/index.ts`, `src/genesis/context.ts`). `package.json` sets `"type": "module"` and `tsconfig.json` uses `"target": "ES2022"`, `"module": "NodeNext"`. `CONTEXT.md` states "Linguagem: TypeScript (Node.js 20+, ESM)".
- **Node.js (JavaScript runtime)** — `package.json` declares `"engines": { "node": ">=20.0.0" }` and the CLI entry `src/cli/index.ts` uses `#!/usr/bin/env node`. `CONTEXT.md` confirms "Node.js 20+".

## Frameworks
- Not detected from provided context (no UI/web/MVC frameworks are imported or declared).

## Build Tools
- **TypeScript compiler (`tsc`)** — `package.json` `scripts`: `"build": "tsc"`, `"typecheck": "tsc --noEmit"`. `tsconfig.json` defines `outDir: "./dist"`, `rootDir: "./src"`.
- **tsx** — `package.json` devDependency `tsx ^4.19.4`; script `"dev": "tsx src/cli/index.ts"`.
- **esbuild** — `package.json` devDependency `esbuild ^0.28.1`; referenced by script `"build:sea": "node scripts/build-sea.mjs"`.
- **postject** — `package.json` devDependency `postject ^1.0.0-alpha.6`; used in `scripts/build-sea.mjs` (per directory structure and `build:sea` script).

## Testing
- Not detected from provided context (no test framework or `test` script present in `package.json`; `scripts` only include build/dev/start/typecheck).

## Development Tools
- **@types/node** — `package.json` devDependency `@types/node ^22.15.21`; `tsconfig.json` includes `"types": ["node"]`.
- **chalk** — `package.json` dependency `chalk ^5.4.1`; imported in `src/commands/config.ts`, `src/commands/help.ts`, `src/commands/registry.ts`, `src/commands/builtins.ts`, `src/providers/retry.ts`, `src/ui/animation.ts`, `src/ui/steps.ts`, `src/ui/prompt.ts`, `src/genesis/planner.ts` for terminal colors.

## Infrastructure
- Not detected from provided context (no Docker, CI/CD, or deployment config files are present in the provided directory structure or config files).

## Key Dependencies
| Dependency | Type | Why it is used (verifiable) |
|------------|------|------------------------------|
| `chalk` (^5.4.1) | production | Only production dependency in `package.json`; used across UI and command files for colored terminal output (e.g. `ACCENT`, `DIM`, `SUCCESS` in `src/ui/steps.ts`). |
| `typescript` (^5.8.3) | dev | Required to compile `.ts` sources to `dist/` via `tsc` (build/typecheck scripts). |
| `tsx` (^4.19.4) | dev | Runs TypeScript directly in dev mode (`npm run dev`). |
| `esbuild` (^0.28.1) | dev | Used by `scripts/build-sea.mjs` (single-file executable build via `build:sea`). |
| `postject` (^1.0.0-alpha.6) | dev | Used by `scripts/build-sea.mjs` to inject payload into binary (per `build:sea` script and directory). |
| `@types/node` (^22.15.21) | dev | Provides Node.js type definitions for `tsconfig.json` `types: ["node"]`. |