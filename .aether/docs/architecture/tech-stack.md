# Tech Stack

> Generated from verified project context only. Technologies listed are proven by `package.json`, `tsconfig.json`, or import statements in the provided source.

## Languages
- **TypeScript** — The entire `src/` tree is `.ts` (e.g. `src/cli/index.ts`, `src/genesis/context.ts`), `tsconfig.json` sets `"target": "ES2022"`, `"module": "NodeNext"`, and `package.json` scripts use `tsc` and `tsx`. `CONTRIBUTING.md` states "Write TypeScript, not JavaScript."
- **Node.js (JavaScript runtime)** — `package.json` declares `"engines": { "node": ">=20.0.0" }` and `"type": "module"`; source uses `node:fs`, `node:path`, `node:crypto`, `node:child_process`, `node:readline` imports.

## Frameworks
- **None detected** — No web, UI, or application frameworks appear in `package.json` dependencies or imports. (README mentions providers but those are accessed via direct HTTP in `openai-compatible.ts`, not a framework.)

## Build Tools
- **TypeScript compiler (`typescript`)** — `devDependencies` includes `"typescript": "^5.8.3"`; `package.json` `"build": "tsc"` and `"typecheck": "tsc --noEmit"`; `tsconfig.json` defines compilation output to `./dist`.
- **esbuild** — `devDependencies` includes `"esbuild": "^0.28.1"`; used by `scripts/build-sea.mjs` (referenced by `"build:sea": "node scripts/build-sea.mjs"`).
- **postject** — `devDependencies` includes `"postject": "^1.0.0-alpha.6"`; used in `scripts/build-sea.mjs` for Single Executable Application build (`build:sea` script).
- **tsx** — `devDependencies` includes `"tsx": "^4.19.4"`; used in `"dev": "tsx src/cli/index.ts"` to run TypeScript directly in development.

## Testing
- **Not detected from provided context** — No test framework, test files, or test scripts appear in `package.json` or the directory structure.

## Development Tools
- **None detected** — No linter (e.g. eslint), formatter (e.g. prettier), or dev utility beyond the build/run tools above is present in `package.json` or configs.

## Infrastructure
- **Not detected from provided context** — `sea-config.json` exists in the root but its contents are not provided; no Docker, CI/CD, or deployment tooling is visible in `package.json` or config files.

## Key Dependencies
| Dependency | Type | Evidence | Why used (verified) |
|------------|------|----------|---------------------|
| `chalk` (`^5.4.1`) | runtime `dependencies` | `package.json`; imported in `src/ui/animation.ts`, `src/commands/registry.ts`, `src/commands/help.ts`, `src/commands/config.ts`, `src/providers/retry.ts`, `src/ui/steps.ts`, `src/ui/prompt.ts`, `src/genesis/planner.ts` | Provides colored terminal output (e.g. `ACCENT = chalk.bold.hex("#895bf4")` in `src/ui/animation.ts`, `registry` error coloring in `src/commands/registry.ts`). |
| `typescript` (`^5.8.3`) | `devDependencies` | `package.json`, `tsconfig.json` | Compiles `.ts` sources to `./dist` (`"build": "tsc"`). |
| `tsx` (`^4.19.4`) | `devDependencies` | `package.json` | Runs `src/cli/index.ts` directly in dev (`"dev": "tsx src/cli/index.ts"`). |
| `esbuild` (`^0.28.1`) | `devDependencies` | `package.json` | Bundling step for `build:sea` via `scripts/build-sea.mjs`. |
| `postject` (`^1.0.0-alpha.6`) | `devDependencies` | `package.json` | Injects payload into binary in `scripts/build-sea.mjs` (`build:sea`). |
| `@types/node` (`^22.15.21`) | `devDependencies` | `package.json`, `tsconfig.json` (`"types": ["node"]`) | Type definitions for Node.js built-in modules used across `src/`. |

> Note: `src/config/index.ts` defines `AetherConfig` with provider options `openai | anthropic | gemini | openrouter`, and `src/providers/factory.ts` creates `OpenAICompatibleProvider` for those providers. These are integration targets accessed via `node:fetch` (implicit in `openai-compatible.ts` POST), not installed npm dependencies.