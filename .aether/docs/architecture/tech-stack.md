# Tech Stack

## Languages
- **TypeScript** — The entire `src/` tree is composed of `.ts` files (e.g. `src/cli/index.ts`, `src/commands/registry.ts`, `src/genesis/context.ts`). `package.json` sets `"type": "module"` and `tsconfig.json` targets `ES2022` with `module: NodeNext`. `CONTRIBUTING.md` states "Write TypeScript, not JavaScript".
- **Node.js (>=20)** — `package.json` declares `"engines": { "node": ">=20.0.0" }`. `docs/architecture.md` and `docs/development.md` list "Node.js 20+" as a requirement. `src/cli/index.ts` uses `process.stdin.isTTY`, `process.argv`, and `process.exit`, all Node.js runtime APIs.

## Frameworks
- Not detected from provided context (no UI/web/MVC frameworks present in imports or config).

## Build Tools
- **TypeScript compiler (`tsc`)** — `package.json` `scripts`: `"build": "tsc"`, `"typecheck": "tsc --noEmit"`. `tsconfig.json` defines compiler options (`outDir: ./dist`, `rootDir: ./src`, `target: ES2022`, `module: NodeNext`).
- **esbuild** — Listed in `package.json` `devDependencies` (`"esbuild": "^0.28.1"`). Used by `scripts/build-sea.mjs` (referenced by `"build:sea": "node scripts/build-sea.mjs"`).
- **postject** — Listed in `package.json` `devDependencies` (`"postject": "^1.0.0-alpha.6"`). Referenced by the `build:sea` script via `scripts/build-sea.mjs`.
- **tsx** — Listed in `package.json` `devDependencies` (`"tsx": "^4.19.4"`). Used in `scripts`: `"dev": "tsx src/cli/index.ts"` for TypeScript execution in development.

## Testing
- Not detected from provided context (no test frameworks or test files present in `package.json` or directory structure).

## Development Tools
- **chalk** — Listed in `package.json` `dependencies` (`"chalk": "^5.4.1"`). Imported in `src/commands/help.ts`, `src/commands/config.ts`, `src/commands/builtins.ts`, `src/ui/animation.ts`, `src/ui/steps.ts`, `src/ui/prompt.ts`, `src/genesis/planner.ts`, `src/providers/retry.ts` for terminal colors (hex support, e.g. `chalk.hex("#895bf4")`).
- **@types/node** — Listed in `package.json` `devDependencies` (`"@types/node": "^22.15.21"`). `tsconfig.json` includes `"types": ["node"]` for Node.js type definitions.
- **TypeScript** — Listed in `package.json` `devDependencies` (`"typescript": "^5.8.3"`); also serves as the type-checking/compiler dev utility.

## Infrastructure
- Not detected from provided context (no Docker, CI/CD, or deployment config files present in the provided directory structure or config files).

## Key Dependencies
| Dependency | Type | Why used (verifiable) |
|------------|------|------------------------|
| `chalk` (^5.4.1) | runtime (`dependencies`) | Terminal color output with hex support; used across UI and command modules for the `#895bf4` accent theme (e.g. `src/ui/animation.ts`, `src/commands/config.ts`). |
| `typescript` (^5.8.3) | dev | Compiler and type checker; powers `build` and `typecheck` scripts and enforces `strict` mode in `tsconfig.json`. |
| `tsx` (^4.19.4) | dev | Runs TypeScript directly in dev (`npm run dev`) without precompilation. |
| `esbuild` (^0.28.1) | dev | Bundler used by `scripts/build-sea.mjs` for the `build:sea` single-executable build. |
| `postject` (^1.0.0-alpha.6) | dev | Injects payload into the binary produced by the `build:sea` script (`scripts/build-sea.mjs`). |
| `@types/node` (^22.15.21) | dev | Provides Node.js type definitions consumed via `tsconfig.json` `"types": ["node"]`. |

No other dependencies are declared in `package.json`. The native `node:fs`, `node:path`, `node:readline`, and `fetch` (global) APIs are used directly in source (e.g. `src/genesis/context.ts`, `src/ui/prompt.ts`, `src/providers/openai-compatible.ts`) with no external HTTP or filesystem libraries.