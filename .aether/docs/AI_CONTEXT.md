# AI Context — aether

You are an AI assistant working on **aether**, a TypeScript CLI that transforms any codebase into an AI-native workspace by scanning a project and generating documentation via LLM providers. Follow the instructions below exactly. Every rule is derived from the actual source files in this repository (`src/`, `package.json`, `tsconfig.json`). Do not invent patterns, files, or technologies not evidenced here.

## 1. Project Identity

Aether is an open-source TypeScript/Node.js CLI (ESM, Node 20+) that analyzes a target codebase and generates a knowledge base (`.aether/docs/`) using OpenAI-compatible LLM providers, driven by an interactive command prompt.

## 2. Always Follow

- Use ESM with `type: "module"` in `package.json`; import paths MUST include the `.js` extension (e.g. `import { registry } from "./registry.js";`) as required by `tsconfig.json` (`module: "NodeNext"`, `moduleResolution: "NodeNext"`).
- Write TypeScript under `strict: true` (see `tsconfig.json`). Avoid `any` — the only allowed cast is in `src/commands/config.ts` `setConfig` (`(config as any)[configKey] = value;` with an eslint-disable comment).
- Use `chalk` (v5, ESM-only) for ALL terminal colors. Accent color is `chalk.hex("#895bf4")`; dim is `chalk.dim`; success is `chalk.green`. See `src/ui/animation.ts`, `src/commands/builtins.ts`, `src/commands/config.ts`.
- Register all CLI commands via the `CommandRegistry` instance exported as `registry` from `src/commands/registry.ts`. Commands are matched case-insensitively (`.toLowerCase()` in `registry.execute`).
- When calling an LLM, wrap `provider.chat()` with `chatWithRetry` from `src/providers/retry.ts` and pass `createRetryLogger()` as `onRetry`.
- Prepend `BASE_PROMPT` and append `PROMPT_SUFFIX` (both from `src/prompts/base.ts`) around any LLM prompt built for doc generation — see `withBase()` in `src/genesis/docs.ts`.
- Keep provider-agnostic: all providers go through `OpenAICompatibleProvider` (constructor `new OpenAICompatibleProvider(baseUrl, apiKey, timeout?, name?)`) created by `createProvider(config)` in `src/providers/factory.ts`. Requests use `Authorization: Bearer <apiKey>` header regardless of provider label.

## 3. Never Do

- Never invent file names, function names, endpoints, classes, modules, or technologies not present in the provided context. (Enforced by `BASE_PROMPT` rules in `src/prompts/base.ts`.)
- Never state that a roadmap / TODO / known-problem item from `CONTEXT.md` or `CONTRIBUTING.md` is implemented unless verifiable in `src/` code. (e.g. `/sync` is a stub in `src/commands/builtins.ts` that only prints "under development" — do NOT treat it as functional.)
- Never let `provider` field in `AetherConfig` drift from the actual `baseUrl`. If `baseUrl` is changed, `detectProviderFromBaseUrl()` in `src/config/index.ts` MUST sync `provider` to the matched host (`openrouter.ai`, `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`).
- Never crash the program with an unhandled exception from a command handler. Errors in `/genesis` are caught and formatted via `formatError()` in `src/commands/builtins.ts`; the prompt loop in `src/ui/prompt.ts` continues.
- Never write doc files outside `docs/` via custom planner paths: `sanitizeDocPath()` in `src/genesis/planner.ts` rejects `..` and absolute paths.
- Do not use parallel doc generation — `src/commands/builtins.ts` generates docs sequentially via `StepRunner`.
- Do not add a fallback between models; if the configured model fails, the error propagates to `formatError()`.

## 4. Key Decisions

- **Prompts are content, not code** — all LLM prompt strings live in `src/prompts/*.ts` (e.g. `AI_CONTEXT_PROMPT` in `src/prompts/ai-context.ts`, `PLANNER_PROMPT` in `src/prompts/planner.ts`) and are re-exported via `src/prompts/index.ts`. Do not inline prompts in logic files.
- **Planner-before-generate** — `planDocs()` in `src/genesis/planner.ts` asks the LLM which docs to emit; `CORE_IDS` (`getting-started`, `onboarding`, `system-overview`, `folder-structure`, `tech-stack`, `ai-context`) are ALWAYS generated. The catalog is `DOC_DEFINITIONS` in `src/genesis/docs.ts`.
- **No fixed file-count cap in scanner** — `scanContext()` in `src/genesis/context.ts` reads all source files ranked by `getImportanceScore()`, bounded only by `MAX_TOTAL_CHARS = 300_000` and `MAX_FILE_SIZE = 32_000`. Omitted files are reported explicitly in `omittedFiles`.
- **Anthropic uses OpenAI-compatible path** — `src/providers/factory.ts` returns `OpenAICompatibleProvider` for `anthropic` (marked TODO: needs separate provider). Do not assume a native Anthropic client exists.
- **Single production dependency** — `package.json` lists only `chalk` as a dependency. Dev deps: `typescript`, `tsx`, `esbuild`, `postject`, `@types/node`. Do not introduce other runtime deps without updating `package.json`.

## 5. Conventions

- Source root is `src/`; `tsconfig.json` sets `rootDir: "./src"`, `outDir: "./dist"`.
- CLI entry: `src/cli/index.ts` (shebang `#!/usr/bin/env node`) registers commands (`registerHelpCommand`, `registerBuiltinCommands`, `registerConfigCommand`) then calls `startChat()` from `src/ui/prompt.ts`.
- Command files live in `src/commands/`: `registry.ts` (class + exported `registry`), `builtins.ts` (`/genesis`, `/sync`, `/exit`, `/clear`), `config.ts` (`/config`), `help.ts` (`/help`).
- Provider files in `src/providers/`: `types.ts` (interfaces `LLMProvider`, `ChatRequest`, etc.), `openai-compatible.ts`, `factory.ts`, `retry.ts`, `index.ts` (re-exports).
- Genesis logic in `src/genesis/`: `context.ts` (`scanContext`, `buildPrompt`), `planner.ts` (`planDocs`), `docs.ts` (`DOC_DEFINITIONS`, `buildCustomDocDefinition`, `buildDocsIndex`).
- UI in `src/ui/`: `animation.ts` (`playStartupAnimation`, `printBanner`), `prompt.ts` (`startChat`), `steps.ts` (`StepRunner`).
- Config type `AetherConfig` and load/save/validate in `src/config/index.ts`; stored at `.aether/config.json` via `saveConfig()`.
- Naming: command handler functions are `registerXCommand()`; prompt constants are `UPPER_SNAKE_CASE` exports (e.g. `BASE_PROMPT`, `AI_CONTEXT_PROMPT`); classes are `PascalCase` (`CommandRegistry`, `OpenAICompatibleProvider`, `StepRunner`).

## 6. File Patterns

- New CLI commands: add a file in `src/commands/` exporting a `registerXCommand()` that calls `registry.register({ name, description, usage?, handler })`, and invoke it from `src/cli/index.ts`.
- New LLM prompt: create `src/prompts/<topic>.ts` exporting a `const <TOPIC>_PROMPT`, and add it to the `export` list in `src/prompts/index.ts`.
- New doc type in catalog: add a `DocDefinition` to `DOC_DEFINITIONS` in `src/genesis/docs.ts` using `withBase(context, <PROMPT>)` for `buildPrompt`.
- New provider: implement the `LLMProvider` interface from `src/providers/types.ts` and add a case in `createProvider()` in `src/providers/factory.ts`.
- Config changes: edit `AetherConfig` and `DEFAULT_CONFIGS` in `src/config/index.ts`; keep `PROVIDER_HOSTS` in sync for `detectProviderFromBaseUrl()`.
- Generated output always lands under `.aether/docs/` with paths defined by each `DocDefinition.outputPath` (e.g. `docs/architecture/system-overview.md`, `docs/AI_CONTEXT.md`); the index is `docs/README.md` built by `buildDocsIndex()`.