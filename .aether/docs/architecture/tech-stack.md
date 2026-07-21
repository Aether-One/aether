# Tech Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Languages** | TypeScript | 5.8.3 | Primary language; strict type checking, ES2022 target, NodeNext modules |
| | JavaScript (ESM) | — | Runtime via Node.js; `type: "module"` in package.json |
| **Runtime** | Node.js | ≥20.0.0 | Execution environment; required by `engines` field |
| **Build Tools** | TypeScript Compiler (tsc) | 5.8.3 | Compiles `src/` → `dist/`; emits declarations, source maps |
| | tsx | 4.19.4 | Development runner (`npm run dev`); executes TS directly |
| | esbuild | 0.28.1 | Used in `scripts/build-sea.mjs` for Single Executable Application bundling |
| | postject | 1.0.0-alpha.6 | Injects JS bundle into Node.js binary for SEA build |
| **Core Dependencies** | chalk | 5.4.1 | Terminal styling (colors, bold, dim) across CLI output, animations, themes |
| **Development Tools** | @types/node | 22.15.21 | Type definitions for Node.js APIs (fs, path, crypto, child_process, readline) |
| **Configuration** | tsconfig.json | — | Strict mode, NodeNext resolution, declaration maps, source maps |
| | package.json | — | ESM entry, scripts (build, dev, typecheck, SEA), dependency management |

## Notes

- **No test framework detected** — No `jest`, `vitest`, `mocha`, or test scripts in `package.json`.
- **No linter/formatter detected** — No `eslint`, `prettier`, `biome`, or related configs in provided context.
- **No Docker/CI/CD detected** — No `Dockerfile`, `docker-compose.yml`, GitHub Actions, or similar in provided context.
- **No additional frameworks** — No Express, Fastify, React, or other application frameworks imported.
- **Single Executable Application (SEA)** — `build:sea` script uses `esbuild` + `postject` to produce a standalone binary (see `scripts/build-sea.mjs`).
- **AI Provider Integrations** — Supports OpenAI, Anthropic, Gemini, and OpenRouter via dedicated provider classes (`src/providers/`).
- **Cost Estimation & Metering** — Built-in token pricing catalog (OpenRouter + static fallback), usage tracking via `MeteredProvider`, and cost formatting for user confirmation prompts.
- **Interactive CLI** — Uses `@clack/core` for spinners, prompts, and cancellation handling (ESC/q/Ctrl+C).
- **Distillation Caching** — Incremental LLM-based file distillation with content-addressable caching (SHA-256) to avoid re-processing unchanged files during `/genesis` and `/sync`.
- **Clean Code Review** — Hybrid static + AI analysis (`/cleancode review`) with heuristic detectors (long functions, deep nesting, magic numbers, dead code, poor naming) and paradigm support (Clean Code, SOLID, Functional, Google Style).
- **Optimized Prompt Generation** — `/prompt` command generates file-referencing prompts for other AI assistants using project knowledge base from `.aether/docs/`.

## Core Dependencies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Core Dependencies** | chalk | 5.4.1 | Terminal styling (colors, bold, dim) across CLI output, animations, themes |
| | @clack/core | 1.4.3 | Interactive CLI primitives (spinners, prompts, text input) used in UI components |
| | esbuild | 0.28.1 | Used in `scripts/build-sea.mjs` for Single Executable Application bundling |
| | postject | 1.0.0-alpha.6 | Injects JS bundle into Node.js binary for SEA build |
| | tsx | 4.19.4 | Development runner (`npm run dev`); executes TS directly |
| | TypeScript Compiler (tsc) | 5.8.3 | Compiles `src/` → `dist/`; emits declarations, source maps |

## Development Tools

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Development Tools** | @types/node | 22.15.21 | Type definitions for Node.js APIs (fs, path, crypto, child_process, readline) |
