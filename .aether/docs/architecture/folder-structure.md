# Folder Structure

## Overview

Aether is a TypeScript CLI (`type: "module"`) that transforms a codebase into an AI-native workspace. The source layout separates the CLI entry point (`src/cli/`), user-facing commands (`src/commands/`), configuration and scaffolding (`src/config/`), the analysis and documentation pipeline (`src/genesis/`), prompt templates (`src/prompts/`), LLM provider integrations (`src/providers/`), and terminal UI helpers (`src/ui/`). The `tsconfig.json` sets `rootDir: "./src"` and `outDir: "./dist"`, so all runtime source lives under `src/`.

## Root Structure

```
aether/
├── scripts/
│   └── build-sea.mjs
├── src/
├── CONTRIBUTING.md
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── sea-config.json
└── tsconfig.json
```

- `scripts/build-sea.mjs` — invoked by `npm run build:sea` (`node scripts/build-sea.mjs` in `package.json`).
- `src/` — All TypeScript source (per `tsconfig.json` `rootDir`).
- `CONTRIBUTING.md` — Author-written contribution guide; describes intent and dev workflow.
- `LICENSE` — MIT license (referenced by `package.json` `"license": "MIT"`).
- `package-lock.json` / `package.json` — Dependency and script definitions.
- `README.md` — Product vision and usage documentation.
- `sea-config.json` — Present at root; no source reference explains its use in the provided context.
- `tsconfig.json` — TypeScript config (`target: ES2022`, `module: NodeNext`, `outDir: ./dist`, `rootDir: ./src`).

## Source Structure

```
src/
├── cli/
│   └── index.ts
├── commands/
│   ├── builtins.ts
│   ├── config.ts
│   ├── help.ts
│   └── registry.ts
├── config/
│   ├── index.ts
│   └── scaffold.ts
├── genesis/
│   ├── context.ts
│   ├── digest.ts
│   ├── distill.ts
│   ├── docs.ts
│   ├── fingerprint.ts
│   ├── planner.ts
│   ├── scope.ts
│   └── sync.ts
├── prompts/
│   ├── ai-context.ts
│   ├── api.ts
│   ├── base.ts
│   ├── business.ts
│   ├── coding-standards.ts
│   ├── contributing.ts
│   ├── custom-doc.ts
│   ├── diagrams.ts
│   ├── folder-structure.ts
│   ├── getting-started.ts
│   ├── glossary.ts
│   ├── index.ts
│   ├── modules.ts
│   ├── onboarding.ts
│   ├── planner.ts
│   ├── sync.ts
│   ├── system-overview.ts
│   └── tech-stack.ts
├── providers/
│   ├── factory.ts
│   ├── index.ts
│   ├── openai-compatible.ts
│   ├── retry.ts
│   └── types.ts
└── ui/
    ├── animation.ts
    ├── prompt.ts
    └── steps.ts
```

- `src/cli/index.ts` — CLI entry (`#!/usr/bin/env node`), calls `main()`, parses `--version`/`-v`/`--no-animation`, registers help/builtin/config commands, and calls `startChat()` from `../ui/prompt.js`.
- `src/commands/` — Command registration and handlers: `registry.ts` (CommandRegistry), `help.ts` (`/help`), `config.ts` (`/config`), `builtins.ts` (`/genesis`, `/sync`, `/exit`, `/clear`).
- `src/config/` — `index.ts` (AetherConfig, load/save/validate, provider detection) and `scaffold.ts` (ensureAetherScaffold, .gitignore and .aether/README.md writing).
- `src/genesis/` — Analysis and doc pipeline: `context.ts` (scanContext, buildPrompt), `digest.ts` (buildPlannerDigest), `distill.ts` (distillFiles), `docs.ts` (DOC_DEFINITIONS, buildDocsIndex), `fingerprint.ts` (buildFingerprint, git info), `planner.ts` (planDocs, parsePlan), `scope.ts` (buildSharedProjectContext), `sync.ts` (used by builtins `/sync`).
- `src/prompts/` — Prompt string templates and `index.ts` re-exports; `base.ts` holds BASE_PROMPT/PROMPT_SUFFIX/HUMAN_BASE_PROMPT/HUMAN_PROMPT_SUFFIX; `custom-doc.ts` exports `buildCustomDocPrompt`.
- `src/providers/` — `types.ts` (ChatMessage, ChatRequest, ChatResponse, StreamChunk, LLMProvider), `openai-compatible.ts` (OpenAICompatibleProvider), `factory.ts` (createProvider), `retry.ts` (chatWithRetry), `index.ts` (re-exports).
- `src/ui/` — `animation.ts` (playStartupAnimation, printBanner), `prompt.ts` (startChat, readline loop), `steps.ts` (StepRunner, LineSpinner).

## Naming Conventions

- Source files use lowercase with hyphens for multi-word names (e.g. `build-sea.mjs`, `openai-compatible.ts`, `folder-structure.ts`).
- CLI commands are registered with lowercase names prefixed by `/` (e.g. `/genesis`, `/sync`, `/config`, `/help`, `/exit`, `/clear`) via `registry.register`.
- Prompt template modules export a constant `UPPER_SNAKE_CASE` prompt string matching their filename (e.g. `src/prompts/system-overview.ts` exports `SYSTEM_OVERVIEW_PROMPT`).
- Config interface is `AetherConfig` in `src/config/index.ts`; provider config keys use camelCase (`baseUrl`, `apiKey`, `maxTokens`).
- Generated docs use output paths like `docs/guides/getting-started.md` defined in `DOC_DEFINITIONS` (`src/genesis/docs.ts`).

## Key Files

- `src/cli/index.ts` — Entry point; declares `declare const __AETHER_VERSION__: string;` with fallback `"0.0.0-dev"`; wires commands and starts chat.
- `package.json` — Defines `bin: { "aether": "./dist/cli/index.js" }`, scripts (`build`, `build:sea`, `dev`, `start`, `typecheck`), and dependency `chalk` (runtime) plus dev deps `esbuild`, `postject`, `tsx`, `typescript`, `@types/node`.
- `tsconfig.json` — Compiler settings; `include: ["src/**/*"]`, `exclude: ["node_modules", "dist"]`.
- `src/commands/registry.ts` — Exports `const registry = new CommandRegistry();` used across commands and UI.
- `src/config/index.ts` — Exports `AetherConfig`, `DEFAULT_CONFIGS`, `loadConfig`, `saveConfig`, `validateConfig`, `detectProviderFromBaseUrl`.
- `src/genesis/context.ts` — Exports `scanContext` and `buildPrompt`; defines `CONFIG_FILES`, `VISION_FILE_CANDIDATES`, `IGNORED_DIRS`, `SOURCE_EXTENSIONS`.
- `src/genesis/docs.ts` — Exports `DOC_DEFINITIONS` and `buildDocsIndex` controlling output doc layout under `.aether/docs/`.
- `src/providers/openai-compatible.ts` — `OpenAICompatibleProvider` implementing `LLMProvider` (chat, chatStream, ping).
- `src/ui/prompt.ts` — `startChat()` readline interface with command dropdown and completer from `registry`.