# Glossary

| Term | Definition |
|------|-----------|
| `AetherConfig` | Interface in `src/config/index.ts` defining provider, model, baseUrl, and optional apiKey for AI provider configuration. |
| `Command` | Interface in `src/commands/registry.ts` describing a registered CLI command (name, description, optional usage, handler). |
| `CommandRegistry` | Class in `src/commands/registry.ts` that stores commands in a Map and provides register/get/getAll/has/execute methods. |
| `registry` | Exported `CommandRegistry` instance in `src/commands/registry.ts` used to register and execute commands. |
| `LLMProvider` | Interface in `src/providers/types.ts` specifying chat, chatStream, and ping methods for AI providers. |
| `ChatMessage` | Interface in `src/providers/types.ts` with role ("system" | "user" | "assistant") and content string. |
| `ChatRequest` | Interface in `src/providers/types.ts` containing messages, model, optional temperature and maxTokens. |
| `ChatResponse` | Interface in `src/providers/types.ts` with content, model, and optional usage token counts. |
| `StreamChunk` | Interface in `src/providers/types.ts` representing a streamed content piece with done flag. |
| `OpenAICompatibleProvider` | Class in `src/providers/openai-compatible.ts` implementing `LLMProvider` via OpenAI-style `/chat/completions` and `/models` endpoints. |
| `createProvider` | Function in `src/providers/factory.ts` that returns an `LLMProvider` based on `AetherConfig` provider field. |
| `chatWithRetry` | Function in `src/providers/retry.ts` wrapping `provider.chat` with exponential backoff retries. |
| `RetryOptions` | Interface in `src/providers/retry.ts` with maxRetries, baseDelay, and optional onRetry callback. |
| `createRetryLogger` | Function in `src/providers/retry.ts` returning a retry callback that prints retry info to stdout. |
| `DocDefinition` | Interface in `src/genesis/docs.ts` describing a generated doc (id, outputPath, label, buildPrompt). |
| `CustomDocSpec` | Interface in `src/genesis/docs.ts` for planner-proposed docs with path, title, and focus. |
| `DOC_DEFINITIONS` | Array in `src/genesis/docs.ts` of fixed `DocDefinition` entries available for generation. |
| `buildCustomDocDefinition` | Function in `src/genesis/docs.ts` converting a `CustomDocSpec` into a `DocDefinition`. |
| `planDocs` | Async function in `src/genesis/planner.ts` using an LLM to decide which docs to generate; always includes CORE_IDS. |
| `CORE_IDS` | Constant array in `src/genesis/planner.ts` listing docs always generated: "system-overview", "folder-structure", "tech-stack", "ai-context". |
| `MAX_CUSTOM_DOCS` | Constant (5) in `src/genesis/planner.ts` limiting planner-proposed custom docs. |
| `ProjectContext` | Interface in `src/genesis/context.ts` holding scanned project data (name, configFiles, visionFiles, sourceFiles, directoryTree, omittedFiles, etc.). |
| `FileContent` | Interface in `src/genesis/context.ts` with path and content string for a read file. |
| `scanContext` | Async function in `src/genesis/context.ts` walking a directory to build a `ProjectContext`. |
| `buildPrompt` | Function in `src/genesis/context.ts` serializing `ProjectContext` into a prompt string for the LLM. |
| `Step` | Interface in `src/ui/steps.ts` with label and status ("pending" | "running" | "writing" | "done" | "error"). |
| `StepRunner` | Class in `src/ui/steps.ts` rendering step progress with a spinner and writing status lines. |
| `playStartupAnimation` | Async function in `src/ui/animation.ts` printing a typed logo and star field to a TTY. |
| `printBanner` | Function in `src/ui/animation.ts` printing a static Aether banner when not interactive. |
| `startChat` | Function in `src/ui/prompt.ts` starting a readline chat loop with command dropdown and tips. |
| `BASE_PROMPT` | Exported string in `src/prompts/base.ts` with anti-hallucination rules prepended to all LLM calls. |
| `PROMPT_SUFFIX` | Exported string in `src/prompts/base.ts` appended after specific prompts to reinforce rules. |
| `PLANNER_PROMPT` | Exported string in `src/prompts/planner.ts` instructing the LLM to return a JSON doc plan. |
| `buildCustomDocPrompt` | Function in `src/prompts/custom-doc.ts` returning a prompt for AI-proposed custom docs. |
| `genesis` | Command registered in `src/commands/builtins.ts` that scans a project, plans, and generates docs via LLM. |
| `sync` | Command registered in `src/commands/builtins.ts` labeled "coming soon"; handler states not available yet. |
| `exit` | Command registered in `src/commands/builtins.ts` that prints goodbye and calls `process.exit(0)`. |
| `clear` | Command registered in `src/commands/builtins.ts` that clears the screen via ANSI code. |
| `config` | Command registered in `src/commands/config.ts` for setting/showing AI provider configuration. |
| `help` | Command registered in `src/commands/help.ts` listing all registered commands. |
| `IGNORED_DIRS` | Set in `src/genesis/context.ts` of directory names skipped during scans (e.g. node_modules, .git). |
| `SOURCE_EXTENSIONS` | Set in `src/genesis/context.ts` of file extensions treated as source code. |
| `VISION_FILE_CANDIDATES` | Array in `src/genesis/context.ts` of root-level intent doc filenames (e.g. CONTRIBUTING.md). |
| `MAX_TOTAL_CHARS` | Constant (300,000) in `src/genesis/context.ts` bounding included context size. |
| `SPINNER_FRAMES` | Array of braille characters in `src/ui/steps.ts` used for the running-step spinner. |
| `TIPS` | Array of tip strings in `src/ui/prompt.ts` shown periodically in the chat loop. |