# Aether — Glossary

| Term | Definition |
|------|-----------|
| `AetherConfig` | Interface in `src/config/index.ts` defining provider config: `provider`, `model`, `baseUrl`, `apiKey?`. |
| `Command` | Interface in `src/commands/registry.ts` describing a registered CLI command (`name`, `description`, `usage?`, `handler`). |
| `CommandRegistry` | Class in `src/commands/registry.ts` storing commands in a `Map` and executing them case-insensitively. |
| `LLMProvider` | Interface in `src/providers/types.ts` with `name`, `chat`, `chatStream`, `ping`. |
| `ChatMessage` | Interface in `src/providers/types.ts` with `role` ("system" | "user" | "assistant") and `content`. |
| `ChatRequest` | Interface in `src/providers/types.ts` with `messages`, `model`, `temperature?`, `maxTokens?`. |
| `ChatResponse` | Interface in `src/providers/types.ts` with `content`, `model`, `usage?`. |
| `StreamChunk` | Interface in `src/providers/types.ts` with `content` and `done`. |
| `OpenAICompatibleProvider` | Class in `src/providers/openai-compatible.ts` implementing `LLMProvider` for any OpenAI-compatible API. |
| `createProvider` | Function in `src/providers/factory.ts` returning an `LLMProvider` from an `AetherConfig`. |
| `chatWithRetry` | Function in `src/providers/retry.ts` wrapping `provider.chat` with up to 3 retries and exponential backoff. |
| `createRetryLogger` | Function in `src/providers/retry.ts` returning an `onRetry` callback that writes sanitized retry messages. |
| `RetryOptions` | Interface in `src/providers/retry.ts` with `maxRetries`, `baseDelay`, `onRetry?`. |
| `ProjectContext` | Interface in `src/genesis/context.ts` holding scanned project data (`name`, `configFiles`, `visionFiles`, `entryPoints`, `sourceFiles`, `directoryTree`, `omittedFiles`). |
| `FileContent` | Interface in `src/genesis/context.ts` with `path` and `content` for a read file. |
| `scanContext` | Function in `src/genesis/context.ts` walking `rootDir` and returning a `ProjectContext`. |
| `buildPrompt` | Function in `src/genesis/context.ts` serializing a `ProjectContext` into the LLM prompt string. |
| `DocDefinition` | Interface in `src/genesis/docs.ts` describing a generatable doc (`id`, `outputPath`, `label`, `title`, `section`, `summary`, `buildPrompt`). |
| `CustomDocSpec` | Interface in `src/genesis/docs.ts` for planner-proposed docs (`path`, `title`, `focus`). |
| `DocSection` | Type in `src/genesis/docs.ts`: "Guides" | "Architecture" | "Reference" | "AI Context" | "Project-specific". |
| `DOC_DEFINITIONS` | Array in `src/genesis/docs.ts` of fixed `DocDefinition` entries available to the planner. |
| `buildCustomDocDefinition` | Function in `src/genesis/docs.ts` converting a `CustomDocSpec` to a `DocDefinition`. |
| `buildDocsIndex` | Function in `src/genesis/docs.ts` writing `docs/README.md` grouped by `SECTION_ORDER`. |
| `SECTION_ORDER` | Array in `src/genesis/docs.ts` ordering doc sections in the index. |
| `planDocs` | Function in `src/genesis/planner.ts` calling the LLM planner and returning `DocDefinition[]`. |
| `CORE_IDS` | Array in `src/genesis/planner.ts` of doc IDs always generated (getting-started, onboarding, system-overview, folder-structure, tech-stack, ai-context). |
| `MAX_CUSTOM_DOCS` | Constant in `src/genesis/planner.ts` set to 5, capping planner-proposed custom docs. |
| `Step` | Interface in `src/ui/steps.ts` with `label` and `status` ("pending" | "running" | "writing" | "done" | "error"). |
| `StepRunner` | Class in `src/ui/steps.ts` rendering step progress in-place via ANSI codes. |
| `BASE_PROMPT` | Exported string in `src/prompts/base.ts` with anti-hallucination rules prepended to all LLM calls. |
| `PROMPT_SUFFIX` | Exported string in `src/prompts/base.ts` appended after specific prompts (sandwich technique). |
| `PLANNER_PROMPT` | Exported string in `src/prompts/planner.ts` instructing the LLM to return a JSON doc plan. |
| `buildCustomDocPrompt` | Function in `src/prompts/custom-doc.ts` returning a prompt for AI-proposed docs. |
| `registry` | Exported `CommandRegistry` instance in `src/commands/registry.ts` used by command modules. |
| `genesis` | CLI command registered in `src/commands/builtins.ts` that scans, plans, and generates docs. |
| `sync` | CLI command registered in `src/commands/builtins.ts` as a stub; prints "under development". |
| `config` | CLI command registered in `src/commands/config.ts` for setting the AI provider. |
| `help` | CLI command registered in `src/commands/help.ts` listing all registered commands. |
| `exit` | CLI command registered in `src/commands/builtins.ts` that terminates the process. |
| `clear` | CLI command registered in `src/commands/builtins.ts` that clears the terminal. |
| `startChat` | Function in `src/ui/prompt.ts` starting the readline interactive prompt loop. |
| `playStartupAnimation` | Function in `src/ui/animation.ts` rendering an animated banner when TTY is present. |
| `printBanner` | Function in `src/ui/animation.ts` printing a static banner. |
| `IGNORED_DIRS` | Set in `src/genesis/context.ts` of directory names skipped during scan (e.g. `node_modules`, `.git`). |
| `SOURCE_EXTENSIONS` | Set in `src/genesis/context.ts` of file extensions treated as source code. |
| `MAX_TOTAL_CHARS` | Constant in `src/genesis/context.ts` (300_000) bounding total scanned char budget. |
| `MAX_FILE_SIZE` | Constant in `src/genesis/context.ts` (32_000) per-file size limit for reading. |
| `detectProviderFromBaseUrl` | Function in `src/config/index.ts` mapping a `baseUrl` host to a provider label. |
| `PROVIDER_HOSTS` | Array in `src/config/index.ts` mapping known hosts to provider names. |
| `DEFAULT_CONFIGS` | Record in `src/config/index.ts` with default `provider`/`model`/`baseUrl` per provider. |