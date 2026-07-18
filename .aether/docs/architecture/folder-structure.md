# Folder Structure

## Overview

The project is a TypeScript CLI tool (Node.js 20+, ESM) named `aether`. Its layout separates the interactive CLI entry point, command implementations, configuration loading, AI provider abstraction, genesis (documentation generation) pipeline, prompt templates, and terminal UI into distinct `src/` subdirectories. Build and project metadata live at the repo root.

## Root Structure

```
aether/
├── scripts/
│   └── build-sea.mjs
├── src/
│   ├── cli/
│   ├── commands/
│   ├── config/
│   ├── genesis/
│   ├── prompts/
│   ├── providers/
│   └── ui/
├── CONTEXT.md
├── CONTRIBUTING.md
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── sea-config.json
└── tsconfig.json
```

- `scripts/` — Contains `build-sea.mjs` (referenced in `package.json` `build:sea` script: `node scripts/build-sea.mjs`).
- `src/` — All TypeScript source code, organized by responsibility (see below).
- `CONTEXT.md` — Author-written project context / vision document.
- `CONTRIBUTING.md` — Author-written contribution guide.
- `LICENSE` — Project license file (MIT per `package.json`).
- `package-lock.json` — Lockfile for dependencies.
- `package.json` — Project manifest (name `aether`, `type: module`, scripts, deps).
- `README.md` — Project readme.
- `sea-config.json` — Configuration file for SEA build (referenced by `build:sea` script and `scripts/build-sea.mjs` presence).
- `tsconfig.json` — TypeScript compiler configuration.

## Source Structure

```
src/
├── cli/
│   └── index.ts              → Entry point, registers commands, starts prompt
├── commands/
│   ├── builtins.ts           → /genesis, /sync, /exit, /clear + formatError()
│   ├── config.ts             → /config (setup of provider)
│   ├── help.ts               → /help (lists commands)
│   └── registry.ts           → CommandRegistry (register/get/execute)
├── config/
│   └── index.ts              → AetherConfig type, load/save/validate config
├── genesis/
│   ├── context.ts            → scanContext() + buildPrompt()
│   ├── docs.ts               → DOC_DEFINITIONS + buildCustomDocDefinition() + buildDocsIndex()
│   └── planner.ts            → planDocs() (AI decides docs to generate)
├── prompts/
│   ├── ai-context.ts         → AI_CONTEXT_PROMPT
│   ├── api.ts                → API_PROMPT
│   ├── base.ts               → BASE_PROMPT + PROMPT_SUFFIX
│   ├── business.ts           → BUSINESS_RULES_PROMPT
│   ├── coding-standards.ts   → CODING_STANDARDS_PROMPT
│   ├── contributing.ts       → CONTRIBUTING_PROMPT
│   ├── custom-doc.ts         → buildCustomDocPrompt()
│   ├── diagrams.ts           → DIAGRAMS_PROMPT
│   ├── folder-structure.ts   → FOLDER_STRUCTURE_PROMPT
│   ├── getting-started.ts    → GETTING_STARTED_PROMPT
│   ├── glossary.ts           → GLOSSARY_PROMPT
│   ├── index.ts              → re-exports all prompts
│   ├── modules.ts            → MODULES_PROMPT
│   ├── onboarding.ts         → ONBOARDING_PROMPT
│   ├── planner.ts            → PLANNER_PROMPT
│   ├── system-overview.ts    → SYSTEM_OVERVIEW_PROMPT
│   └── tech-stack.ts         → TECH_STACK_PROMPT
├── providers/
│   ├── factory.ts            → createProvider(config)
│   ├── index.ts              → re-exports
│   ├── openai-compatible.ts  → OpenAICompatibleProvider
│   ├── retry.ts              → chatWithRetry + createRetryLogger()
│   └── types.ts              → LLMProvider interface + request/response types
└── ui/
    ├── animation.ts          → playStartupAnimation() + printBanner()
    ├── prompt.ts             → startChat() (readline interactive prompt)
    └── steps.ts              → StepRunner (visual step states)
```

## Naming Conventions

- Source files use lowercase with hyphens for multi-word names (e.g. `build-sea.mjs`, `openai-compatible.ts`, `folder-structure.ts`).
- Command files are plural and lowercase (`builtins.ts`, `config.ts`, `help.ts`, `registry.ts`).
- Prompt template files export a constant in `SCREAMING_SNAKE_CASE` (e.g. `FOLDER_STRUCTURE_PROMPT` in `src/prompts/folder-structure.ts`) or a function (`buildCustomDocPrompt` in `src/prompts/custom-doc.ts`).
- ESM imports use explicit `.js` extension for local TypeScript files (e.g. `../ui/animation.js` in `src/cli/index.ts`).
- Top-level directories under `src/` are lowercase and named by responsibility (`cli`, `commands`, `config`, `genesis`, `prompts`, `providers`, `ui`).

## Key Files

- `src/cli/index.ts` — Entry point. Imports `playStartupAnimation`/`printBanner` from `../ui/animation.js`, `startChat` from `../ui/prompt.js`, and command registrars from `../commands/`. Calls `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, then starts animation or banner and `startChat()`.
- `package.json` — Defines `bin` as `aether` → `./dist/cli/index.js`, scripts (`build`: `tsc`, `build:sea`: `node scripts/build-sea.mjs`, `dev`: `tsx src/cli/index.ts`, `start`: `node dist/cli/index.js`, `typecheck`: `tsc --noEmit`), dependency `chalk`, and dev deps `esbuild`, `postject`, `tsx`, `typescript`, `@types/node`.
- `tsconfig.json` — Sets `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `outDir: ./dist`, `rootDir: ./src`.
- `src/commands/registry.ts` — Defines `Command` interface and `CommandRegistry` class with `register`, `get`, `getAll`, `has`, `execute` (case-insensitive name match, lowercase conversion). Exports `registry` instance.
- `src/config/index.ts` — Defines `AetherConfig` interface, `DEFAULT_CONFIGS`, `detectProviderFromBaseUrl()`, `loadConfig()`, `saveConfig()`, `validateConfig()`.
- `src/providers/openai-compatible.ts` — `OpenAICompatibleProvider` class implementing `LLMProvider` with `chat`, `chatStream`, `ping` using `fetch` to `${baseUrl}/chat/completions` and `${baseUrl}/models`.
- `src/genesis/context.ts` — `scanContext()` walks project (respecting `IGNORED_DIRS`, `MAX_FILE_SIZE`, `MAX_TOTAL_CHARS`) and `buildPrompt()` assembles the project context string.
- `src/genesis/planner.ts` — `planDocs()` calls LLM with `PLANNER_PROMPT` and returns `DocDefinition[]` including core IDs and custom docs.
- `src/genesis/docs.ts` — `DOC_DEFINITIONS` array, `buildCustomDocDefinition()`, `buildDocsIndex()` for `docs/README.md`.
- `sea-config.json` — Present at root; consumed by `scripts/build-sea.mjs` (per `build:sea` script), exact contents not provided in context.