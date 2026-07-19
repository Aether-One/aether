# AI Context: aether

You are working on `aether`, a CLI that transforms any codebase into an AI-native workspace by analyzing repositories and generating an AI-ready knowledge base (see `README.md` and `package.json` description: "Transform any codebase into an AI-native workspace.").

## Always Follow

- Write TypeScript, not JavaScript. The project uses `strict: true` in `tsconfig.json` and `CONTRIBUTING.md` states "Write TypeScript, not JavaScript" and "Add types — avoid `any`".
- Use the `CommandRegistry` in `src/commands/registry.ts` for any new CLI command: implement the `Command` interface (`{ name, description, usage?, handler }`) and register via `registry.register(...)`. Built-in commands are registered through `registerBuiltinCommands()` in `src/commands/builtins.ts` and `registerConfigCommand()` in `src/commands/config.ts`.
- When adding LLM-backed features, use the `LLMProvider` interface from `src/providers/types.ts` and instantiate providers via `createProvider(config)` in `src/providers/factory.ts`. All current providers use `OpenAICompatibleProvider` from `src/providers/openai-compatible.ts`.
- Wrap LLM `chat` calls with `chatWithRetry` from `src/providers/retry.ts` (default 3 retries, exponential backoff) and use `createRetryLogger()` for retry output.
- For documentation generation, use the prompt constants re-exported from `src/prompts/index.ts` and the `DocDefinition` structures in `src/genesis/docs.ts`. All LLM doc calls must be wrapped with `BASE_PROMPT`/`PROMPT_SUFFIX` (machine-facing) or `HUMAN_BASE_PROMPT`/`HUMAN_PROMPT_SUFFIX` (human-facing) from `src/prompts/base.ts`.
- Respect environment-variable controls already defined: `AETHER_GEN_CONCURRENCY` (default 4) in `src/commands/builtins.ts`, `AETHER_DISTILL_CONCURRENCY` (default 4) in `src/genesis/distill.ts`, `AETHER_DOC_CONTEXT_CHARS` (default 48_000) in `src/genesis/scope.ts`, and the scan limits `AETHER_MAX_FILE_SIZE`, `AETHER_MAX_TOTAL_CHARS`, `AETHER_MAX_FILES_WALKED`, `AETHER_MAX_WALK_DEPTH` in `src/genesis/context.ts`.
- Store project settings at `join(rootDir, ".aether", "settings", "config.json")` via `getConfigPath` in `src/config/index.ts`; legacy path `join(rootDir, ".aether", "config.json")` is also read by `loadConfig`.

## Never Do

- Do not add a new LLM provider that bypasses `OpenAICompatibleProvider` unless `src/providers/factory.ts` is updated; the factory currently throws `Error(\`Unknown provider: ${config.provider}\`)` for unknown providers.
- Do not write config files outside `.aether/settings/`; `ensureAetherScaffold` in `src/config/scaffold.ts` adds `.aether/settings/config.json` to `.gitignore` and writes `.aether/README.md`.
- Do not generate documentation files outside the `outputPath` values defined in `DOC_DEFINITIONS` (`src/genesis/docs.ts`), which target `docs/` subdirectories under `.aether/`.
- Do not use `any` in TypeScript code; `tsconfig.json` has `strict: true` and `CONTRIBUTING.md` says "avoid `any`".
- Do not skip `validateConfig` when saving config: `src/commands/config.ts` calls `validateConfig` and `saveConfig(process.cwd(), config)` which requires `provider` (enum), `model`, `baseUrl`, `apiKey`.
- Do not invent CLI commands not registered in `registry`; the chat loop in `src/ui/prompt.ts` only routes `/`-prefixed input to `registry.execute`.

## Key Decisions

- The CLI entry point is `src/cli/index.ts` (`#!/usr/bin/env node`), which calls `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, then `startChat()` from `src/ui/prompt.ts`. Do not change command registration flow without updating `index.ts`.
- Provider configuration supports `"openai" | "anthropic" | "gemini" | "openrouter"` per `AetherConfig` in `src/config/index.ts`. `DEFAULT_CONFIGS` and `PROVIDER_HOSTS` map base URLs to providers via `detectProviderFromBaseUrl`.
- Documentation planning uses an LLM to return a JSON array of doc IDs; `planDocs` in `src/genesis/planner.ts` always includes `CORE_IDS` (getting-started, onboarding, system-overview, folder-structure, tech-stack, ai-context) and falls back to them if parsing fails.
- Context assembly in `src/genesis/scope.ts` uses `DOC_CONTEXT_BUDGET` (default 48_000 chars); if the built prompt exceeds budget, it distills via `distillFiles` from `src/genesis/distill.ts` rather than sending full context.
- `sync` command (`src/commands/builtins.ts`) never deletes docs; it merges previous snapshot docs with new plan via `mergeDocMetas` and only refreshes changed files using `diffFingerprint` and `getGitLog` from `src/genesis/fingerprint.ts`.
- Project scanning (`scanContext` in `src/genesis/context.ts`) hardcodes `CONFIG_FILES`, `VISION_FILE_CANDIDATES`, `IGNORED_DIRS`, `SOURCE_EXTENSIONS`, and entry-point candidates; vision files are labeled INTENT in `buildPrompt`.

## Conventions

- File content structures use `interface FileContent { path: string; content: string }` (defined in `src/genesis/context.ts` and `src/genesis/distill.ts`).
- Chat messages follow `ChatMessage` (`role: "system" | "user" | "assistant"; content: string`) from `src/providers/types.ts`.
- CLI commands are named with lowercase verbs: `genesis`, `sync`, `config`, `help`, `exit`, `clear` (see `src/commands/builtins.ts`, `src/commands/config.ts`, `src/commands/help.ts`).
- Doc definitions are grouped by `DocSection`: `"Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific"` with `SECTION_ORDER` enforced in `buildDocsIndex` (`src/genesis/docs.ts`).
- Retry behavior is centralized: `chatWithRetry` in `src/providers/retry.ts` uses `baseDelay * 2^(attempt-1)` backoff.
- UI output uses `chalk` (dependency in `package.json`) and the accent color `chalk.bold.hex("#895bf4")` in `src/ui/animation.ts`.

## File Patterns

- CLI entry: `src/cli/index.ts`.
- Commands: `src/commands/*.ts` (e.g. `builtins.ts`, `config.ts`, `help.ts`, `registry.ts`).
- Config logic: `src/config/*.ts` (`index.ts`, `scaffold.ts`).
- Genesis pipeline: `src/genesis/*.ts` (`context.ts`, `digest.ts`, `distill.ts`, `docs.ts`, `fingerprint.ts`, `planner.ts`, `scope.ts`, `sync.ts`).
- Prompt templates: `src/prompts/*.ts` (one file per prompt, e.g. `base.ts`, `system-overview.ts`, `custom-doc.ts`); aggregate exports in `src/prompts/index.ts`.
- Providers: `src/providers/*.ts` (`types.ts`, `factory.ts`, `openai-compatible.ts`, `retry.ts`, `index.ts`).
- UI: `src/ui/*.ts` (`animation.ts`, `prompt.ts`, `steps.ts`).
- Build script for single executable: `scripts/build-sea.mjs` (referenced in `package.json` `build:sea`).
- Config file: `sea-config.json` at project root.
- New doc prompts go in `src/prompts/` and must be re-exported from `src/prompts/index.ts`, then added to `DOC_DEFINITIONS` in `src/genesis/docs.ts` with a unique `id` and `outputPath` under `docs/`.
- New commands go in `src/commands/` and must be registered via a `register*Command` function called from `src/cli/index.ts`.