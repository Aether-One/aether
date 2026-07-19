# Business Rules

This document captures the behavioral rules, constraints, and workflows explicitly implemented in the Aether codebase. Each rule is traceable to specific source code.

---

## Domain Rules

### BR-001: Version Injection at Build Time
- **Description**: The CLI version is injected at build time via `__AETHER_VERSION__` global. If not injected (development), falls back to `"0.0.0-dev"`.
- **Affected Modules**: `src/cli/index.ts`
- **Exceptions**: Development mode uses fallback version `"0.0.0-dev"`
- **Source**: `src/cli/index.ts` — `const VERSION = (globalThis as any).__AETHER_VERSION__ ?? "0.0.0-dev"`

### BR-002: Version Flag Short-Circuits Execution
- **Description**: If `--version` or `-v` flag is present, CLI prints version and exits with code 0 immediately, skipping all other initialization.
- **Affected Modules**: `src/cli/index.ts`
- **Exceptions**: None — exits before any other initialization
- **Source**: `src/cli/index.ts` — `if (process.argv.includes("--version") || process.argv.includes("-v")) { console.log(`aether v${VERSION}`); process.exit(0); }`

### BR-003: Interactive Mode Detection
- **Description**: Interactive mode is enabled only when `process.stdin.isTTY` is truthy. Non-TTY stdin (pipes, CI) disables interactive features.
- **Affected Modules**: `src/cli/index.ts`, `src/ui/prompt.ts`
- **Exceptions**: `--no-animation` flag can disable startup animation even in TTY
- **Source**: `src/cli/index.ts` — `const isInteractive = process.stdin.isTTY ?? false;`

### BR-004: Animation Disabled by Flag or Non-TTY
- **Description**: Startup animation (`playStartupAnimation`) runs only in interactive TTY mode AND without `--no-animation` flag. Otherwise, static banner (`printBanner`) is shown.
- **Affected Modules**: `src/cli/index.ts`, `src/ui/animation.ts`
- **Exceptions**: `--no-animation` flag forces static banner even in TTY
- **Source**: `src/cli/index.ts` — `if (isInteractive && !process.argv.includes("--no-animation")) { await playStartupAnimation(); } else { printBanner(); }`

### BR-005: Command Registration Order is Fixed
- **Description**: Commands are registered in a fixed order: help → builtins → config → clean. This determines command precedence in the registry.
- **Affected Modules**: `src/cli/index.ts`, `src/commands/registry.ts`
- **Exceptions**: None — registration order is hardcoded in `main()`
- **Source**: `src/cli/index.ts` — sequential `registerHelpCommand()`, `registerBuiltinCommands()`, `registerConfigCommand()`, `registerCleanCommand()`

### BR-006: Command Registry Only Executes `/`-Prefixed Input
- **Description**: `CommandRegistry.execute()` returns `false` (not handled) for any input not starting with `/`. Only `/`-prefixed commands are routed to registered handlers.
- **Affected Modules**: `src/commands/registry.ts`, `src/ui/prompt.ts`
- **Exceptions**: None — non-command input falls through to chat response handler
- **Source**: `src/commands/registry.ts` — `if (!input.startsWith("/")) return false;`

### BR-007: Command Names Are Case-Insensitive
- **Description**: Command names are lowercased before registry lookup (`name.toLowerCase()`).
- **Affected Modules**: `src/commands/registry.ts`
- **Exceptions**: None
- **Source**: `src/commands/registry.ts` — `const name = parts[0].toLowerCase();`

### BR-008: Config Provider Must Be One of Four Values
- **Description**: Valid provider values are strictly `"openai" | "anthropic" | "gemini" | "openrouter"`. Any other value fails validation.
- **Affected Modules**: `src/config/types.ts`, `src/config/index.ts`, `src/commands/config.ts`
- **Exceptions**: None — validation rejects invalid providers
- **Source**: `src/config/types.ts` — `provider: "openai" | "anthropic" | "gemini" | "openrouter"`

### BR-009: Config Requires Provider, Model, and BaseUrl
- **Description**: `validateConfig()` returns errors if `provider`, `model`, or `baseUrl` are missing. `apiKey` is optional (can come from env).
- **Affected Modules**: `src/config/index.ts`, `src/commands/config.ts`
- **Exceptions**: `apiKey` optional — can be provided via `AETHER_API_KEY` env var
- **Source**: `src/config/index.ts` — `validateConfig()` checks for missing `provider`, `model`, `baseUrl`

### BR-010: Provider Auto-Detected from BaseUrl
- **Description**: When `baseUrl` is set, `detectProviderFromBaseUrl()` infers provider from hostname: `openrouter.ai`→`openrouter`, `api.openai.com`→`openai`, `api.anthropic.com`→`anthropic`, `generativelanguage.googleapis.com`→`gemini`.
- **Affected Modules**: `src/config/index.ts`, `src/commands/config.ts`
- **Exceptions**: Unknown hosts return `null` — provider must be set explicitly
- **Source**: `src/config/index.ts` — `PROVIDER_HOSTS` mapping and `detectProviderFromBaseUrl()`

### BR-011: Config Precedence Order Is Fixed
- **Description**: Config resolution order (highest to lowest): 1) Project global entry, 2) Shared global default, 3) In-repo override (`.aether/config.json` or `.aether/settings/config.json`), 4) `AETHER_API_KEY` env var.
- **Affected Modules**: `src/config/index.ts`
- **Exceptions**: None — precedence is hardcoded in `loadConfig()`
- **Source**: `src/config/index.ts` — `loadConfig()` resolution order

### BR-012: First Config Save Creates Global Default
- **Description**: First call to `saveConfig()` writes to `default` in global config. Subsequent calls only update `projects[projectId]`.
- **Affected Modules**: `src/config/index.ts`
- **Exceptions**: None — behavior is hardcoded in `saveConfig()`
- **Source**: `src/config/index.ts` — `if (!globalFile.default) { globalFile.default = config; } else { globalFile.projects[projectId] = config; }`

### BR-013: API Keys Never Stored in Repo
- **Description**: `apiKey` is only stored in global config (`~/.aether/config.json`) or `AETHER_API_KEY` env var. In-repo configs (`.aether/config.json`, `.aether/settings/config.json`) never store secrets.
- **Affected Modules**: `src/config/index.ts`, `src/config/readme.ts`
- **Exceptions**: None — enforced by config loading/saving logic
- **Source**: `src/config/readme.ts` — "Secrets (apiKey) are stored only in the global config or via the AETHER_API_KEY environment variable — never in the repo."

### BR-014: Project ID Is Hash-Based
- **Description**: Project ID = `${basename(absPath)}-${sha1(absPath).slice(0,12)}`. Used for cache directory and global config project key.
- **Affected Modules**: `src/config/index.ts`
- **Exceptions**: None — deterministic hash-based ID
- **Source**: `src/config/index.ts` — `getProjectCacheDir()` uses `createHash("sha1").update(abs).digest("hex").slice(0, 12)`

### BR-015: File Size Limit for Scanning
- **Description**: Files larger than `MAX_FILE_SIZE` (default 128KB, env `AETHER_MAX_FILE_SIZE`) are omitted from scanning.
- **Affected Modules**: `src/genesis/constants.ts`, `src/genesis/context.ts` (implied)
- **Exceptions**: Configurable via `AETHER_MAX_FILE_SIZE` env var
- **Source**: `src/genesis/constants.ts` — `MAX_FILE_SIZE = envInt("AETHER_MAX_FILE_SIZE", 128_000)`

### BR-016: Total Character Budget for Scanning
- **Description**: Total scanned characters capped at `MAX_TOTAL_CHARS` (default 2M, env `AETHER_MAX_TOTAL_CHARS`). Omitted files tracked in `omittedFiles`.
- **Affected Modules**: `src/genesis/constants.ts`, `src/genesis/context.ts`
- **Exceptions**: Configurable via `AETHER_MAX_TOTAL_CHARS`
- **Source**: `src/genesis/constants.ts` — `MAX_TOTAL_CHARS = envInt("AETHER_MAX_TOTAL_CHARS", 2_000_000)`

### BR-017: File Walk Limits
- **Description**: File walker capped at `MAX_FILES_WALKED` (10k, env `AETHER_MAX_FILES_WALKED`) files and `MAX_WALK_DEPTH` (12, env `AETHER_MAX_WALK_DEPTH`) directory depth.
- **Affected Modules**: `src/genesis/constants.ts`
- **Exceptions**: Configurable via env vars
- **Source**: `src/genesis/constants.ts` — `MAX_FILES_WALKED`, `MAX_WALK_DEPTH`

### BR-018: Distillation Reuses Cached Notes by Content Hash
- **Description**: `distillFilesIncremental()` reuses previous distillation notes only if file content hash matches AND model is identical. Changed files or model change trigger re-distillation.
- **Affected Modules**: `src/genesis/distill.ts`
- **Exceptions**: Model change invalidates entire cache
- **Source**: `src/genesis/distill.ts` — `if (prev && prev.model === model) { ... reuse prev.files ... }`

### BR-019: Distillation Concurrency Limited
- **Description**: Concurrent distillation limited to `DISTILL_CONCURRENCY` (default 4, env `AETHER_DISTILL_CONCURRENCY`).
- **Affected Modules**: `src/genesis/distill.ts`, `src/genesis/constants.ts`
- **Exceptions**: Configurable via env var
- **Source**: `src/genesis/constants.ts` — `DISTILL_CONCURRENCY = envInt("AETHER_DISTILL_CONCURRENCY", 4)`

### BR-020: Distillation Splits Large Files by Budget
- **Description**: Files exceeding `budget` chars are split into chunks of size `budget` and each chunk distilled separately. Results concatenated.
- **Affected Modules**: `src/genesis/distill.ts`
- **Exceptions**: None — budget comes from `DOC_CONTEXT_BUDGET` (48k default)
- **Source**: `src/genesis/distill.ts` — `if (file.content.length > budget) { units = split into budget-sized chunks }`

### BR-021: Shared Context Budget for Doc Generation
- **Description**: Shared project context for all doc generation limited to `DOC_CONTEXT_BUDGET` (default 48k chars, env `AETHER_DOC_CONTEXT_CHARS`). Exceeds budget → distillation used.
- **Affected Modules**: `src/genesis/constants.ts`, `src/genesis/scope.ts`
- **Exceptions**: Configurable via env var
- **Source**: `src/genesis/constants.ts` — `DOC_CONTEXT_BUDGET = envInt("AETHER_DOC_CONTEXT_CHARS", 48_000)`

### BR-022: Doc Generation Concurrency Limited
- **Description**: Concurrent doc generation limited to `GEN_CONCURRENCY` (default 4, env `AETHER_GEN_CONCURRENCY`).
- **Affected Modules**: `src/genesis/constants.ts`
- **Exceptions**: Configurable via env var
- **Source**: `src/genesis/constants.ts` — `GEN_CONCURRENCY = envInt("AETHER_GEN_CONCURRENCY", 4)`

### BR-023: Planner Retries Up to 3 Times with Strict Format
- **Description**: `planDocs()` retries up to `MAX_PLAN_ATTEMPTS` (3). Attempt 1 uses temperature 0.1; retries use temperature 0 + strict format reminder.
- **Affected Modules**: `src/genesis/planner.ts`
- **Exceptions**: None — hardcoded retry logic
- **Source**: `src/genesis/planner.ts` — `MAX_PLAN_ATTEMPTS = 3`, temperature logic

### BR-024: Planner Falls Back to Core Docs on Failure
- **Description**: If planner returns no valid docs after retries, falls back to `CORE_IDS` (core documentation set).
- **Affected Modules**: `src/genesis/planner.ts`
- **Exceptions**: Only if at least one response was received (not total failure)
- **Source**: `src/genesis/planner.ts` — fallback logic after retries exhausted

### BR-025: Custom Docs Limited to 5
- **Description**: Planner-proposed custom docs limited to `MAX_CUSTOM_DOCS` (5). Excess custom docs discarded.
- **Affected Modules**: `src/genesis/planner.ts`
- **Exceptions**: None — hardcoded limit
- **Source**: `src/genesis/planner.ts` — `MAX_CUSTOM_DOCS = 5`

### BR-026: Custom Doc Paths Sanitized
- **Description**: Custom doc paths sanitized: `.md` extension removed, path traversal (`..`, leading `/`) stripped, must end with `.md`.
- **Affected Modules**: `src/genesis/planner.ts`
- **Exceptions**: Invalid paths rejected during parsing
- **Source**: `src/genesis/planner.ts` — `parsePlan()` sanitization logic

### BR-027: Sync Never Deletes Docs
- **Description**: `SyncPlan` only contains `regenerate` (existing docs to refresh) and `add` (new docs). No deletion operation exists.
- **Affected Modules**: `src/genesis/types.ts`, `src/genesis/sync.ts`
- **Exceptions**: None — `SyncPlan` type has no delete field
- **Source**: `src/genesis/types.ts` — `SyncPlan = { regenerate: DocDefinition[]; add: DocDefinition[]; }`

### BR-028: Sync Regenerates Anchor Docs If No Changes
- **Description**: If `planSync` produces empty plan (no changes detected), it regenerates anchor docs: `system-overview`, `folder-structure`, `tech-stack`, `ai-context`.
- **Affected Modules**: `src/genesis/sync.ts`
- **Exceptions**: Only when diff shows no changes and planner returns empty plan
- **Source**: `src/genesis/sync.ts` — `ANCHOR_IDS = ["system-overview", "folder-structure", "tech-stack", "ai-context"]` fallback

### BR-029: Sync Uses Section-Level Patching
- **Description**: `refreshDoc()` attempts section-level patches (H2 headings) via `applySectionPatch()`. Falls back to full rewrite if no H2 sections or patching fails.
- **Affected Modules**: `src/genesis/sync.ts`
- **Exceptions**: Docs without `## ` headings get full rewrite
- **Source**: `src/genesis/sync.ts` — `refreshDoc()` logic with `splitSections()` and `applySectionPatch()`

### BR-030: Snapshot Stores Git Info If Available
- **Description**: `writeSnapshot()` includes git commit, branch, and dirty status if `getGitInfo()` succeeds (git repo, git available). Otherwise `git` field omitted.
- **Affected Modules**: `src/genesis/sync.ts`, `src/genesis/fingerprint.ts`
- **Exceptions**: Non-git repos or git failures → no git info in snapshot
- **Source**: `src/genesis/fingerprint.ts` — `getGitInfo()` returns `null` on error

### BR-031: Fingerprint Uses SHA256 + Byte Size
- **Description**: `FileFingerprint` = `{ hash: sha256(content), size: byteLength }`. Used for change detection in sync.
- **Affected Modules**: `src/genesis/types.ts`, `src/genesis/fingerprint.ts`
- **Exceptions**: None — deterministic fingerprinting
- **Source**: `src/genesis/types.ts` — `FileFingerprint` interface; `src/genesis/fingerprint.ts` — `buildFingerprint()`

### BR-032: LLM Provider Must Implement Chat, Stream, and Ping
- **Description**: `LLMProvider` interface requires `chat()`, `chatStream()`, and `ping()` methods. All providers must implement all three.
- **Affected Modules**: `src/providers/types.ts`, `src/providers/openai-compatible.ts`, `src/providers/factory.ts`
- **Exceptions**: None — interface contract
- **Source**: `src/providers/types.ts` — `LLMProvider` interface

### BR-033: All Providers Use OpenAI-Compatible Adapter
- **Description**: `createProvider()` returns `OpenAICompatibleProvider` for all four providers (`openai`, `anthropic`, `gemini`, `openrouter`). Anthropic case has TODO noting different API format needed.
- **Affected Modules**: `src/providers/factory.ts`
- **Exceptions**: Anthropic marked as needing separate provider implementation
- **Source**: `src/providers/factory.ts` — all cases return `new OpenAICompatibleProvider(...)`

### BR-034: Retry Logic with Exponential Backoff
- **Description**: `chatWithRetry()` retries up to `maxRetries` (default 3) with exponential backoff (`baseDelay * 2^attempt`). Rate limits (429/"rate limit") use extended options: 6 retries, 15s base delay.
- **Affected Modules**: `src/providers/retry.ts`
- **Exceptions**: Rate limit errors trigger `RATE_LIMIT_OPTIONS` (6 retries, 15s base)
- **Source**: `src/providers/retry.ts` — `DEFAULT_OPTIONS`, `RATE_LIMIT_OPTIONS`, `chatWithRetry()`

### BR-035: Retry Delay Extracted from Provider Error
- **Description**: `extractRetryDelay()` parses `retry-in/after Ns` from error message. If found and 0<N<600, uses that delay instead of exponential backoff.
- **Affected Modules**: `src/providers/retry.ts`
- **Exceptions**: Only used for rate limit errors; parsed delay capped at 600s
- **Source**: `src/providers/retry.ts` — `extractRetryDelay()` regex `/retry[\s_-]*(?:in|after)\s*([\d.]+)\s*s/i`

### BR-036: Streaming Uses Idle Timeout on Any Byte
- **Description**: `OpenAICompatibleProvider` streaming resets idle timeout on *any* received byte (including SSE keepalive `:` comments), not just tokens.
- **Affected Modules**: `src/providers/openai-compatible.ts`
- **Exceptions**: None — timeout reset on any data
- **Source**: `src/providers/openai-compatible.ts` — `clearTimeout(idleTimer); idleTimer = setTimeout(...)` on each chunk

### BR-037: Streaming Parses SSE Format Strictly
- **Description**: Stream parser expects `data: ` prefix, skips blank lines and `:` comment lines. `[DONE]` sentinel ends stream. Malformed JSON chunks silently skipped.
- **Affected Modules**: `src/providers/openai-compatible.ts`
- **Exceptions**: Malformed chunks skipped without error
- **Source**: `src/providers/openai-compatible.ts` — SSE parsing logic in `streamRaw()`

### BR-038: Interactive REPL Requires TTY
- **Description**: `startChat()` creates readline interface on `process.stdin`/`process.stdout`. Requires TTY for keypress events and dropdown rendering.
- **Affected Modules**: `src/ui/prompt.ts`
- **Exceptions**: Non-TTY stdin → readline may not work properly (not explicitly handled)
- **Source**: `src/ui/prompt.ts` — `createInterface({ input: process.stdin, output: process.stdout })`

### BR-039: Tab Completion Only for `/` Commands
- **Description**: Readline completer only returns matches for input starting with `/`. Non-command input gets no completions.
- **Affected Modules**: `src/ui/prompt.ts`
- **Exceptions**: None
- **Source**: `src/ui/prompt.ts` — `completer()` returns `[]` for non-`/` input

### BR-040: Dropdown Shows Max 6 Matches
- **Description**: Command dropdown renders maximum 6 matching commands + "(+N more)" indicator.
- **Affected Modules**: `src/ui/prompt.ts`
- **Exceptions**: None — hardcoded limit
- **Source**: `src/ui/prompt.ts` — `const maxVisible = 6;`

### BR-041: Step Runner Supports Concurrent Pooled Execution
- **Description**: `StepRunner.runPooled(limit, fn)` runs up to `limit` concurrent workers. First failure aborts all and rethrows.
- **Affected Modules**: `src/ui/steps.ts`
- **Exceptions**: None — failure propagation is immediate
- **Source**: `src/ui/steps.ts` — `runPooled()` implementation

### BR-042: Environment Variable Parsing Strict
- **Description**: `envInt()` returns fallback if env var unset, not a finite number, or ≤0.
- **Affected Modules**: `src/util/env.ts`
- **Exceptions**: None — strict validation
- **Source**: `src/util/env.ts` — `if (!val || !Number.isFinite(n) || n <= 0) return fallback;`

### BR-043: Config Timeout Optional
- **Description**: `AetherConfig.timeout` is optional (idle timeout in ms). Not required for valid config.
- **Affected Modules**: `src/config/types.ts`
- **Exceptions**: None — optional field
- **Source**: `src/config/types.ts` — `timeout?: number`

### BR-044: Distill Cache Stored Per-Project in Cache Dir
- **Description**: Distillation cache saved to `~/.aether/cache/{projectId}/distill-cache.json`. Project ID derived from path hash.
- **Affected Modules**: `src/genesis/scope.ts`, `src/config/index.ts`
- **Exceptions**: None — deterministic cache location
- **Source**: `src/genesis/scope.ts` — `distillCachePath()` uses `getProjectCacheDir()`

### BR-045: Distill Cache Best-Effort Write
- **Description**: `saveDistillCache()` swallows all errors (best-effort). Cache loss doesn't break operation.
- **Affected Modules**: `src/genesis/scope.ts`
- **Exceptions**: None — errors caught and ignored
- **Source**: `src/genesis/scope.ts` — `saveDistillCache()` try/catch with empty catch block

### BR-046: Snapshot Written to `.aether/settings/context.json`
- **Description**: `writeSnapshot()` writes to `.aether/settings/context.json`. Legacy fallback read from `.aether/context.json`.
- **Affected Modules**: `src/genesis/sync.ts`
- **Exceptions**: Legacy path read for backward compatibility
- **Source**: `src/genesis/sync.ts` — `snapshotPath()` and `resolveSnapshotPath()`

### BR-047: Sync Diff Lists Files Up to 60
- **Description**: `formatChanges()` limits listed added/modified/deleted files to `MAX_LISTED_FILES` (60) in change summary.
- **Affected Modules**: `src/genesis/sync.ts`
- **Exceptions**: None — hardcoded limit
- **Source**: `src/genesis/sync.ts` — `MAX_LISTED_FILES = 60`

### BR-048: Section Patch Requires H2 Headings
- **Description**: `applySectionPatch()` splits document by `## ` headings. Docs without H2 sections fall back to full rewrite.
- **Affected Modules**: `src/genesis/sync.ts`
- **Exceptions**: No H2 headings → full update via `fullUpdate()`
- **Source**: `src/genesis/sync.ts` — `splitSections()` and `refreshDoc()` logic

### BR-049: Section Patch Normalizes Heading Format
- **Description**: `normalizeSection()` ensures patch content starts with `## ` heading. Heading matching is case-insensitive, ignores leading `#` and whitespace.
- **Affected Modules**: `src/genesis/sync.ts`
- **Exceptions**: None — normalization enforced
- **Source**: `src/genesis/sync.ts` — `normalizeSection()` and `normHeading()`

### BR-050: Planner Prompt Uses Sandwich Technique
- **Description**: All LLM prompts use sandwich: `BASE_PROMPT` (rules) + context + specific prompt + `PROMPT_SUFFIX` (rules repeated).
- **Affected Modules**: `src/prompts/base.ts`, `src/genesis/planner.ts`, `src/genesis/sync.ts`, `src/genesis/scope.ts`
- **Exceptions**: None — universal pattern
- **Source**: `src/prompts/base.ts` — `BASE_PROMPT` and `PROMPT_SUFFIX` constants

### BR-051: Anti-Hallucination Rules Enforced in Prompts
- **Description**: `BASE_PROMPT` and `PROMPT_SUFFIX` explicitly forbid inventing files, technologies, patterns, or rules not in context. Require "Not detected" for unknowns.
- **Affected Modules**: `src/prompts/base.ts`
- **Exceptions**: None — applies to all LLM calls
- **Source**: `src/prompts/base.ts` — `BASE_PROMPT` and `PROMPT_SUFFIX` content

### BR-052: Human-Facing Prompts Have Separate Contract
- **Description**: `HUMAN_BASE_PROMPT` and `HUMAN_PROMPT_SUFFIX` define different rules for human-readable docs (explain WHY, lead with goals, vision files as primary source).
- **Affected Modules**: `src/prompts/base.ts`, `src/prompts/docs/getting-started.ts`, `src/prompts/docs/onboarding.ts`, `src/prompts/docs/contributing.ts`
- **Exceptions**: Only used for specific human-facing doc types
- **Source**: `src/prompts/base.ts` — `HUMAN_BASE_PROMPT`, `HUMAN_PROMPT_SUFFIX`

### BR-053: Config Command Supports Quick Provider Setup
- **Description**: `/config <provider>` (openai|anthropic|gemini|openrouter) applies provider defaults (model, baseUrl) and prompts for API key.
- **Affected Modules**: `src/commands/config.ts`
- **Exceptions**: None — four providers hardcoded
- **Source**: `src/commands/config.ts` — quick setup logic in handler

### BR-054: Config Set Command Validates Keys
- **Description**: `/config set <key> <value>` only accepts `provider`, `model`, `url`/`baseUrl`, `key`/`apiKey` (case-insensitive). Other keys rejected.
- **Affected Modules**: `src/commands/config.ts`
- **Exceptions**: None — strict key allowlist
- **Source**: `src/commands/config.ts` — `validKeys` array and validation

### BR-055: Config Show Masks API Key
- **Description**: `/config show` displays API key as first 4 + last 4 chars with `••••` middle (e.g., `sk-ab••••cd`).
- **Affected Modules**: `src/commands/config.ts`
- **Exceptions**: Keys ≤8 chars shown as `••••••••`
- **Source**: `src/commands/config.ts` — `maskKey()` function

### BR-056: Clean Command Manages Global Data
- **Description**: `/clean` command (registered via `registerCleanCommand`) manages global caches, configs, and projects. Implementation in `src/commands/clean.ts`.
- **Affected Modules**: `src/commands/clean.ts`, `src/cli/index.ts`
- **Exceptions**: None — registered as builtin command
- **Source**: `src/cli/index.ts` — `registerCleanCommand()` called in main()

### BR-057: Builtin Commands Registered via Registry
- **Description**: `/genesis`, `/sync`, `/doctor`, `/explain`, `/export` registered via `registerBuiltinCommands()` in `src/commands/builtins.ts`.
- **Affected Modules**: `src/commands/builtins.ts`, `src/cli/index.ts`
- **Exceptions**: Only `/genesis` appears implemented; others registered but may be stubs
- **Source**: `src/commands/builtins.ts` — `registerBuiltinCommands()` exports

### BR-058: Help Command Lists All Registered Commands
- **Description**: `/help` command (via `registerHelpCommand`) displays all commands from registry with descriptions and usage.
- **Affected Modules**: `src/commands/help.ts`, `src/commands/registry.ts`
- **Exceptions**: None — uses `registry.getAll()`
- **Source**: `src/commands/help.ts` — `registerHelpCommand()` implementation

### BR-059: Startup Animation Uses ANSI Clear Screen
- **Description**: `playStartupAnimation()` clears terminal with `\x1Bc` before animating starfield and typing "⚡ aether".
- **Affected Modules**: `src/ui/animation.ts`
- **Exceptions**: `--no-animation` flag skips to `printBanner()`
- **Source**: `src/ui/animation.ts` — `playStartupAnimation()` implementation

### BR-060: Theme Uses Fixed Purple Accent
- **Description**: All UI theming uses `#895bf4` (purple) for accent, with bold/dim/green/red variants.
- **Affected Modules**: `src/ui/theme.ts`, all UI modules
- **Exceptions**: None — single color scheme
- **Source**: `src/ui/theme.ts` — `ACCENT_HEX = "#895bf4"`

---

## Workflows

### WF-001: CLI Startup Sequence
1. Parse `--version`/`-v` → print version, exit 0
2. Register commands (help → builtins → config → clean)
3. Detect TTY → `isInteractive`
4. Check `--no-animation` flag
5. If interactive && not no-animation → `playStartupAnimation()`
6. Else → `printBanner()`
7. Call `startChat()` → interactive REPL
8. Uncaught errors → stderr, exit 1
- **Source**: `src/cli/index.ts` — `main()` function

### WF-002: Config Load Resolution
1. Compute project root → `projectId`
2. Read global config `~/.aether/config.json`
3. Read in-repo config `.aether/config.json` or `.aether/settings/config.json`
4. Read `AETHER_API_KEY` env
5. Merge: project global entry → global default → in-repo override → env apiKey
6. Return merged `AetherConfig` or `null`
- **Source**: `src/config/index.ts` — `loadConfig()`

### WF-003: Config Save Flow
1. Validate config → errors (blocking) + warnings (non-blocking)
2. Read existing global config
3. If no global default → write config as `default`
4. Else → write config to `projects[projectId]`
5. Write atomically to `~/.aether/config.json`
- **Source**: `src/config/index.ts` — `saveConfig()`

### WF-004: Genesis/Scan Context Building
1. Walk project directory (respecting `MAX_FILES_WALKED`, `MAX_WALK_DEPTH`)
2. Read files up to `MAX_FILE_SIZE` each, total `MAX_TOTAL_CHARS`
3. Categorize: configFiles, visionFiles, entryPoints, sourceFiles
4. Build directory tree string
5. Track omitted files (too large, over budget)
6. Return `ProjectContext`
- **Source**: `src/genesis/context.ts` (implied from types and constants)

### WF-005: Distillation Pipeline
1. Load previous `DistillCache` from cache dir
2. Filter files: stale if hash mismatch or model changed
3. For each stale file (concurrent, limit `DISTILL_CONCURRENCY`):
   - Split if > budget
   - Call LLM per chunk with distillation prompt
   - Concatenate results
4. Update cache with new hashes + notes
5. Save cache (best-effort)
6. Return combined notes + updated cache
- **Source**: `src/genesis/distill.ts` — `distillFilesIncremental()`

### WF-006: Shared Context Assembly
1. Build full prompt from `ProjectContext`
2. If ≤ `DOC_CONTEXT_BUDGET` → return verbatim
3. Else:
   - Deduplicate entryPoints + sourceFiles by path
   - Load distill cache
   - Run distillation pipeline
   - Build orientation prompt (empty file lists)
   - Return orientation + "## Distilled Source Facts" + notes
- **Source**: `src/genesis/scope.ts` — `buildSharedProjectContext()`

### WF-007: Doc Planning (Planner)
1. Build planner digest from `ProjectContext`
2. Construct prompt: `BASE_PROMPT` + digest + `PLANNER_PROMPT` + `PROMPT_SUFFIX`
3. Call LLM (temp 0.1, retry up to 3x with stricter formatting)
4. Parse JSON array response → catalog IDs + custom doc specs
5. Merge `CORE_IDS` with returned catalog IDs (dedupe)
6. Filter `DOC_DEFINITIONS` for catalog IDs
7. Build custom doc definitions (max 5, sanitized paths)
8. Return combined `DocDefinition[]`
- **Source**: `src/genesis/planner.ts` — `planDocs()`

### WF-008: Sync Planning
1. Load previous snapshot (`.aether/settings/context.json`)
2. Build current fingerprint from `ProjectContext`
3. Diff fingerprints → `FileDiff` (added/modified/deleted)
4. If no changes AND no git log → regenerate anchor docs
5. Else build change summary (files + git log)
6. Call LLM with `SYNC_PLANNER_PROMPT` + change summary + existing docs
7. Parse response → `SyncPlan` (regenerate + add)
8. Resolve doc definitions from metadata
9. Write new snapshot
- **Source**: `src/genesis/sync.ts` — `planSync()`, `diffFingerprint()`, `loadSnapshot()`

### WF-009: Doc Refresh with Section Patching
1. For each doc to regenerate:
   - If no H2 sections → full rewrite via `buildDocUpdatePrompt`
   - Else:
     - Build section patch prompt with `DOC_UPDATE_INSTRUCTIONS` + `SECTION_PATCH_INSTRUCTIONS`
     - Call LLM (up to 3 attempts, strict JSON)
     - Parse `SectionPatch[]` → apply via `applySectionPatch()`
     - On failure → full rewrite fallback
- **Source**: `src/genesis/sync.ts` — `refreshDoc()`, `applySectionPatch()`

### WF-010: LLM Chat with Retry
1. Call `provider.chat(request)`
2. On error:
   - If rate limit (429/"rate limit") → use `RATE_LIMIT_OPTIONS` (6 retries, 15s base)
   - Else → use `DEFAULT_OPTIONS` (3 retries, 2s base)
   - Extract retry delay from error if present
   - Call `onRetry` callback
   - Exponential backoff
3. Return response or throw last error
- **Source**: `src/providers/retry.ts` — `chatWithRetry()`

### WF-011: Streaming Chat
1. POST to `/chat/completions` with `stream: true`
2. Set 2min idle timeout (reset on any byte)
3. Parse SSE: skip blanks/comments, expect `data: `
4. Yield `StreamChunk` per token
5. On `[DONE]` → yield `{ content: "", done: true }`
6. Aggregate usage from final chunk
- **Source**: `src/providers/openai-compatible.ts` — `streamRaw()`, `chatStream()`, `chat()`

### WF-012: Interactive REPL Loop
1. Create readline interface with completer
2. Show tip every 4 messages
3. On keypress: show dropdown for `/` commands
4. On line:
   - If `/` command → `registry.execute()` → if handled, continue
   - Else → `respond()` (keyword-based static responses)
5. On close (Ctrl+C/D) → exit message, `process.exit(0)`
- **Source**: `src/ui/prompt.ts` — `startChat()`, `promptUser()`, `completer()`, `showDropdown()`

---

## Permissions

### PR-001: Config Write Requires Filesystem Access
- **Description**: `saveConfig()` writes to `~/.aether/config.json`. Requires write access to user home directory.
- **Affected Modules**: `src/config/index.ts`
- **Exceptions**: None — fails if no write permission

### PR-002: Cache Dir Created on Demand
- **Description**: `getProjectCacheDir()` and `saveDistillCache()` create `~/.aether/cache/{projectId}/` recursively. Requires write access to home.
- **Affected Modules**: `src/config/index.ts`, `src/genesis/scope.ts`
- **Exceptions**: Errors swallowed in `saveDistillCache()` (best-effort)

### PR-003: Git Info Requires Git Binary
- **Description**: `getGitInfo()` and `getGitLog()` execute `git` via `execFileSync`. Requires git in PATH and valid repo.
- **Affected Modules**: `src/genesis/fingerprint.ts`
- **Exceptions**: Returns `null` on any error (no git, not a repo, permission denied)

### PR-004: LLM API Requires Network + Valid Key
- **Description**: All provider calls require network access to `baseUrl` and valid `apiKey` (except possibly empty string allowed but will fail auth).
- **Affected Modules**: `src/providers/openai-compatible.ts`, `src/providers/factory.ts`
- **Exceptions**: None — runtime requirement

---

## Validations

### VL-001: Config Validation Rules
- **Rule**: `provider` required, must be one of 4 values
- **Rule**: `model` required, non-empty string
- **Rule**: `baseUrl` required, non-empty string
- **Rule**: `apiKey` optional (warns if missing)
- **Rule**: `timeout` optional, number if present
- **Source**: `src/config/index.ts` — `validateConfig()`

### VL-002: Config Set Key Validation
- **Rule**: Only `provider`, `model`, `url`/`baseUrl`, `key`/`apiKey` allowed (case-insensitive)
- **Source**: `src/commands/config.ts` — `validKeys` array

### VL-003: Provider Quick-Setup Validation
- **Rule**: Quick setup argument must be one of `openai`, `anthropic`, `gemini`, `openrouter`
- **Source**: `src/commands/config.ts` — `validProviders` array

### VL-004: Custom Doc Spec Validation
- **Rule**: `path` must be string, sanitized (no `..`, no leading `/`, ends with `.md`)
- **Rule**: `title` string, max 120 chars
- **Rule**: `focus` string, max 500 chars
- **Source**: `src/genesis/planner.ts` — `parsePlan()` validation

### VL-005: Env Int Validation
- **Rule**: Env var must be parseable integer > 0, else fallback
- **Source**: `src/util/env.ts` — `envInt()`

### VL-006: JSON Array Extraction Validation
- **Rule**: `extractJsonArray()` finds first `[` and last `]`, parses. Returns `null` if invalid.
- **Source**: `src/genesis/planner.ts` — `extractJsonArray()`

---

## Edge Cases

### EC-001: No Config Found
- **Behavior**: `loadConfig()` returns `null`. Commands requiring config (genesis, sync) must handle.
- **Source**: `src/config/index.ts` — `loadConfig()` returns `null` if no config sources exist

### EC-002: First Config Save Creates Default
- **Behavior**: First `saveConfig()` call writes to `globalFile.default`. Subsequent calls write to `projects[projectId]`.
- **Source**: `src/config/index.ts` — `saveConfig()` logic

### EC-003: Anthropic Provider Uses OpenAI Adapter (Known Gap)
- **Behavior**: `createProvider("anthropic", ...)` returns `OpenAICompatibleProvider` with TODO comment noting API format difference.
- **Source**: `src/providers/factory.ts` — anthropic case comment

### EC-004: Distill Cache Model Mismatch Invalidates All
- **Behavior**: If `prev.model !== currentModel`, entire cache discarded. All files re-distilled.
- **Source**: `src/genesis/distill.ts` — `distillFilesIncremental()` model check

### EC-005: Large File Split in Distillation
- **Behavior**: Files > budget split into `budget`-sized chunks. Each chunk distilled separately. Results concatenated.
- **Source**: `src/genesis/distill.ts` — `distillSingle()` splitting logic

### EC-006: Sync Snapshot Legacy Path Fallback
- **Behavior**: `loadSnapshot()` tries `.aether/settings/context.json` first, falls back to `.aether/context.json` (pre-fingerprint format). Pre-fingerprint snapshots (no `files` field) return `null`.
- **Source**: `src/genesis/sync.ts` — `loadSnapshot()` and `resolveSnapshotPath()`

### EC-007: Section Patch Heading Matching Flexible
- **Behavior**: `normHeading()` strips leading `#`, whitespace, lowercases for matching. Patch heading can be `## Title` or `Title`.
- **Source**: `src/genesis/sync.ts` — `normHeading()`, `normalizeSection()`

### EC-008: Section Patch Insertion Order
- **Behavior**: New sections inserted after `after` heading if specified, else appended. Existing sections replaced in-place.
- **Source**: `src/genesis/sync.ts` — `applySectionPatch()` insertion logic

### EC-009: Dropdown Cleanup on Input Change
- **Behavior**: `showDropdown()` clears previous dropdown via `clearDropdown()` before rendering new one. Uses ANSI cursor save/restore.
- **Source**: `src/ui/prompt.ts` — `showDropdown()`, `clearDropdown()`

### EC-010: Spinner Stops on Any Exit Path
- **Behavior**: `StepRunner.runStep()` and `runPooled()` stop spinner in `finally` block. `LineSpinner` stops in `succeed()`/`fail()`.
- **Source**: `src/ui/steps.ts` — `runStep()`, `runPooled()`, `LineSpinner`

### EC-011: Non-TTY Stdin Disables Interactive Features
- **Behavior**: `isInteractive = false` → no animation, no REPL (though `startChat()` still called, readline may not work properly).
- **Source**: `src/cli/index.ts` — `isInteractive` detection

### EC-012: Command Not Found Returns False
- **Behavior**: `registry.execute()` returns `false` for unknown commands. `promptUser()` treats as unhandled → falls to `respond()`.
- **Source**: `src/commands/registry.ts` — `execute()` returns `false` if `!cmd`

### EC-013: Empty Planner Response Triggers Fallback
- **Behavior**: If planner returns valid JSON but empty array, and at least one response received → fallback to `CORE_IDS`.
- **Source**: `src/genesis/planner.ts` — `planDocs()` fallback logic

### EC-014: Rate Limit Retry Uses Provider-Suggested Delay
- **Behavior**: If error contains `retry-in Ns` or `retry-after Ns`, that delay used (capped at 600s) instead of exponential backoff.
- **Source**: `src/providers/retry.ts` — `extractRetryDelay()`, `chatWithRetry()`

### EC-015: Streaming Idle Timeout Reset on SSE Comments
- **Behavior**: SSE `:` keepalive comments reset 2min idle timeout, preventing disconnect during slow generation.
- **Source**: `src/providers/openai-compatible.ts` — `streamRaw()` timeout reset on any chunk

### EC-016: Malformed SSE Chunks Silently Skipped
- **Behavior**: JSON parse errors on SSE data lines caught and ignored. Stream continues.
- **Source**: `src/providers/openai-compatible.ts` — `streamRaw()` try/catch on `JSON.parse()`

### EC-017: Config Warnings Don't Block Save
- **Behavior**: `validateConfig()` returns warnings array. `config` command shows warnings but saves anyway.
- **Source**: `src/commands/config.ts` — warning display after validation

### EC-018: Project README Created Once
- **Behavior**: `ensureProjectReadme()` returns early if `.aether/README.md` exists. Best-effort write (errors ignored).
- **Source**: `src/config/scaffold.ts` — `ensureProjectReadme()`

### EC-019: Distill Cache Load Failure Returns Null
- **Behavior**: `loadDistillCache()` returns `null` on any read/parse error. Triggers full re-distillation.
- **Source**: `src/genesis/scope.ts` — `loadDistillCache()` try/catch

### EC-020: Snapshot Write Failure Silent
- **Behavior**: `writeSnapshot()` errors caught and ignored (best-effort).
- **Source**: `src/genesis/sync.ts` — `writeSnapshot()` try/catch

---

## Behavioral Constraints (Library/Tool Rules)

### BC-001: No Secrets in Repository
- **Constraint**: `apiKey` never written to in-repo config files. Only global config or env var.
- **Enforcement**: `saveConfig()` only writes to global; `loadConfig()` reads `apiKey` from global/env only.

### BC-002: Deterministic Project Identity
- **Constraint**: Project ID derived from absolute path hash. Same path = same ID across machines.
- **Enforcement**: `getProjectCacheDir()` uses `sha1(absPath)`.

### BC-003: Budget-Conscious Context Assembly
- **Constraint**: Shared context for doc generation capped at `DOC_CONTEXT_BUDGET`. Exceeds → distillation.
- **Enforcement**: `buildSharedProjectContext()` checks prompt length vs budget.

### BC-004: Concurrency Bounded Everywhere
- **Constraint**: All parallel operations use explicit limits: `DISTILL_CONCURRENCY`, `GEN_CONCURRENCY`, `runPooled(limit)`.
- **Enforcement**: Constants + `mapPool()` + `StepRunner.runPooled()`.

### BC-005: Retry with Backoff on All LLM Calls
- **Constraint**: Every LLM call goes through `chatWithRetry()` with exponential backoff.
- **Enforcement**: `planDocs()`, `planSync()`, `distillFilesIncremental()`, `refreshDoc()` all use `chatWithRetry()`.

### BC-006: Sandwich Prompt Pattern Universal
- **Constraint**: All LLM prompts wrapped with `BASE_PROMPT` (prefix) and `PROMPT_SUFFIX` (suffix).
- **Enforcement**: `planDocs()`, `planSync()`, `buildSharedProjectContext()`, `distillSingle()`, `refreshDoc()` all construct prompts this way.

### BC-007: Anti-Hallucination Rules in Every Prompt
- **Constraint**: `BASE_PROMPT` and `PROMPT_SUFFIX` explicitly forbid inventing files, tech, patterns, rules.
- **Enforcement**: Included in every LLM call via sandwich pattern.

### BC-008: Human-Facing Docs Use Different Contract
- **Constraint**: Getting started, onboarding, contributing use `HUMAN_BASE_PROMPT`/`HUMAN_PROMPT_SUFFIX` (explain WHY, lead with goals).
- **Enforcement**: Those prompt files import and use human variants.

### BC-009: Sync Is Additive + Refresh Only
- **Constraint**: `SyncPlan` has no delete operation. Docs only added or regenerated.
- **Enforcement**: Type definition `SyncPlan = { regenerate: DocDefinition[]; add: DocDefinition[] }`.

### BC-010: Section Patching Preserves Byte-Exact Unchanged Sections
- **Constraint**: `applySectionPatch()` preserves untouched sections byte-for-byte. Only modified/added sections change.
- **Enforcement**: `splitSections()` + `applySectionPatch()` logic.

### BC-011: Snapshot Is Point-in-Time Truth
- **Constraint**: Snapshot captures git commit, branch, dirty state, file fingerprints, doc metadata at generation time.
- **Enforcement**: `writeSnapshot()` builds complete `Snapshot` object.

### BC-012: Fingerprint Is Content-Addressable
- **Constraint**: `FileFingerprint` uses SHA256 of content + byte size. No timestamps, no paths in hash.
- **Enforcement**: `buildFingerprint()` uses `createHash("sha256").update(content)`.

### BC-013: All Config Paths Absolute
- **Constraint**: Global config at `~/.aether/config.json`, cache at `~/.aether/cache/{projectId}/`, project config at `.aether/config.json`.
- **Enforcement**: `getGlobalConfigPath()`, `getProjectCacheDir()`, `loadConfig()` path resolution.

### BC-014: Environment Variables Override Defaults Only
- **Constraint**: `AETHER_MAX_FILE_SIZE`, `AETHER_MAX_TOTAL_CHARS`, etc. only affect default constants. Cannot override explicit config.
- **Enforcement**: `envInt()` used only in constant initialization.

### BC-015: Version Injected at Build, Not Runtime
- **Constraint**: `__AETHER_VERSION__` replaced at build time (via SEA build or TypeScript define). Runtime fallback only for dev.
- **Enforcement**: `src/cli/index.ts` reads `globalThis.__AETHER_VERSION__`.

---

*Generated from source code analysis. All rules traceable to files in `src/`.*