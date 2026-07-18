# Folder Structure

## Overview

The project is organized as a TypeScript CLI application. Source code lives under `src/` and is split by responsibility (CLI entry, commands, config, genesis pipeline, prompts, providers, UI). Documentation and build scripts sit at the root or in `docs/` and `scripts/`.

## Root Structure

```
aether/
├── docs/            Documentation written by the project team (architecture, commands, development)
├── scripts/         Build scripts (e.g. build-sea.mjs)
├── src/             All application source code
├── CONTRIBUTING.md  Contribution guidelines and intended structure
├── LICENSE          MIT license
├── package-lock.json  Lockfile for dependencies
├── package.json     Project manifest, scripts, dependencies
├── README.md        Product overview and quick start
├── sea-config.json  Configuration for single-executable build (referenced by scripts/build-sea.mjs)
└── tsconfig.json    TypeScript compiler configuration
```

- `docs/` contains `architecture.md`, `commands.md`, `development.md`.
- `scripts/` contains `build-sea.mjs`.
- Root markdown/config files: `CONTRIBUTING.md`, `LICENSE`, `package-lock.json`, `package.json`, `README.md`, `sea-config.json`, `tsconfig.json`.

## Source Structure

```
src/
├── cli/
│   └── index.ts           CLI entry point (shebang, arg parsing, registers commands, starts chat)
├── commands/
│   ├── builtins.ts        Registers /genesis, /sync, /exit, /clear
│   ├── config.ts          Registers /config command
│   ├── help.ts            Registers /help command
│   └── registry.ts        CommandRegistry class and registry instance
├── config/
│   └── index.ts           AetherConfig interface, load/save/validate config, provider defaults
├── genesis/
│   ├── context.ts         scanContext(), buildPrompt(), ProjectContext interface
│   ├── docs.ts            DocDefinition, DOC_DEFINITIONS, buildCustomDocDefinition
│   └── planner.ts         planDocs(), parsePlan(), sanitizeDocPath()
├── prompts/
│   ├── ai-context.ts      AI_CONTEXT_PROMPT
│   ├── api.ts             API_PROMPT
│   ├── base.ts            BASE_PROMPT, PROMPT_SUFFIX
│   ├── business.ts        BUSINESS_RULES_PROMPT
│   ├── coding-standards.ts CODING_STANDARDS_PROMPT
│   ├── custom-doc.ts      buildCustomDocPrompt()
│   ├── diagrams.ts        DIAGRAMS_PROMPT
│   ├── folder-structure.ts FOLDER_STRUCTURE_PROMPT
│   ├── glossary.ts        GLOSSARY_PROMPT
│   ├── index.ts           Re-exports all prompt constants/functions
│   ├── modules.ts         MODULES_PROMPT
│   ├── planner.ts         PLANNER_PROMPT
│   ├── system-overview.ts SYSTEM_OVERVIEW_PROMPT
│   └── tech-stack.ts      TECH_STACK_PROMPT
├── providers/
│   ├── factory.ts         createProvider()
│   ├── index.ts           Re-exports provider types and classes
│   ├── openai-compatible.ts OpenAICompatibleProvider class
│   ├── retry.ts           chatWithRetry(), createRetryLogger()
│   └── types.ts           LLMProvider, ChatMessage, ChatRequest, ChatResponse, StreamChunk
└── ui/
    ├── animation.ts       playStartupAnimation(), printBanner()
    ├── prompt.ts          startChat(), dropdown, chat loop
    └── steps.ts           StepRunner class
```

## Naming Conventions

- Source files use lowercase with hyphens for multi-word names (e.g. `build-sea.mjs`, `openai-compatible.ts`, `coding-standards.ts`).
- Command modules are named by responsibility: `builtins.ts`, `config.ts`, `help.ts`, `registry.ts`.
- Prompt modules each export a constant or function in `kebab-case` file names matching the exported symbol (e.g. `system-overview.ts` exports `SYSTEM_OVERVIEW_PROMPT`).
- TypeScript modules use `NodeNext` resolution with `.js` import extensions (visible in `src/cli/index.ts` importing `../ui/animation.js`).
- The `src/genesis/` directory groups the analysis pipeline (`context.ts`, `docs.ts`, `planner.ts`).

## Key Files

- `src/cli/index.ts` — Entry point. Declares `__AETHER_VERSION__`, handles `--version`/`-v`, registers help/builtin/config commands, plays startup animation or prints banner based on TTY and `--no-animation`, then calls `startChat()`.
- `package.json` — Defines `bin` as `aether` → `./dist/cli/index.js`, scripts (`build`, `build:sea`, `dev`, `start`, `typecheck`), dependency `chalk`, devDependencies (`@types/node`, `esbuild`, `postject`, `tsx`, `typescript`), engine `node >=20.0.0`.
- `tsconfig.json` — Target `ES2022`, module `NodeNext`, `outDir ./dist`, `rootDir ./src`, strict mode.
- `src/commands/registry.ts` — Defines `Command` interface and `CommandRegistry` class; exports `registry` instance used across command modules.
- `src/config/index.ts` — Defines `AetherConfig` (provider, model, baseUrl, apiKey), `DEFAULT_CONFIGS` for openai/anthropic/gemini/openrouter, and load/save/validate functions writing to `.aether/config.json`.
- `src/genesis/context.ts` — `scanContext()` walks the target directory (respecting `IGNORED_DIRS`, size/depth limits) and `buildPrompt()` assembles the project context string.
- `src/providers/openai-compatible.ts` — `OpenAICompatibleProvider` implementing `chat`, `chatStream`, `ping` against `${baseUrl}/chat/completions` and `/models`.
- `scripts/build-sea.mjs` — Referenced by `build:sea` script; purpose not detailed in provided source beyond filename and script mapping.