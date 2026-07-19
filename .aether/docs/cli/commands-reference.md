# Aether CLI Commands

## CLI Entry Point

The CLI entry point is `src/cli/index.ts`. It is declared with `#!/usr/bin/env node` and calls `main()`.

Supported CLI flags (from `src/cli/index.ts`):
- `--version` / `-v`: prints `aether v${VERSION}` (using `declare const __AETHER_VERSION__: string;` with fallback `"0.0.0-dev"`) and exits.
- `--no-animation`: disables the startup animation.

At startup, `src/cli/index.ts`:
- Imports and calls `registerHelpCommand()` (`../commands/help.js`), `registerBuiltinCommands()` (`../commands/builtins.js`), and `registerConfigCommand()` (`../commands/config.js`).
- Uses `process.stdin.isTTY` to decide between `playStartupAnimation()` (`../ui/animation.js`) and `printBanner()`.
- Calls `startChat()` from `../ui/prompt.js` to begin interactive input.

## Command Registry

Commands are managed by `src/commands/registry.ts`:
- Defines `interface Command { name: string; description: string; usage?: string; handler: (args: string) => Promise<void> | void; }`.
- Exports `class CommandRegistry` with methods: `register`, `get`, `getAll`, `has`, `execute(input)`.
- `execute` parses input of the form `/command args`, lowercases the command name, and calls the registered handler.
- A singleton `const registry = new CommandRegistry();` is exported.

## Registered Commands

The following commands are registered via the registry based on the provided source facts.

| Command | Registration Source | Description | Usage |
|---------|---------------------|-------------|-------|
| `/help` | `src/commands/help.ts` (`registerHelpCommand`) | Lists all commands from `registry.getAll()` | `/help` |
| `/config` | `src/commands/config.ts` (`registerConfigCommand`) | Configure LLM provider settings | `/config [--provider <name>] [--model <model>] [--url <baseUrl>] [--key <apiKey>]` |
| `/genesis` | `src/commands/builtins.ts` (`registerBuiltinCommands`) | Analyze and document your project with AI | `/genesis [path]` |
| `/sync` | `src/commands/builtins.ts` (`registerBuiltinCommands`) | Refresh only the docs affected by what changed since the last run | `/sync [path]` |
| `/exit` | `src/commands/builtins.ts` (`registerBuiltinCommands`) | Exit the CLI | `/exit` |
| `/clear` | `src/commands/builtins.ts` (`registerBuiltinCommands`) | Clear the terminal screen | `/clear` |

### `/help`
- Registered by `registerHelpCommand()` in `src/commands/help.ts`.
- Lists all commands returned by `registry.getAll()` using `chalk` for output.

### `/config`
- Registered by `registerConfigCommand()` in `src/commands/config.ts`.
- Supported arguments: `--help`/`-h`/`help`, empty or `show`, `set` (e.g. `set model gpt-4o`), or a direct provider name (`openai`, `anthropic`, `gemini`, `openrouter`).
- `keyMap` maps: `provider`, `model`, `url`/`baseurl` → `baseUrl`, `key`/`apikey` → `apiKey`.
- On `baseUrl` set, calls `detectProviderFromBaseUrl` and syncs `provider` if matched.
- Calls `validateConfig`, `saveConfig(process.cwd(), config)`, and `loadConfig(process.cwd())`.

### `/genesis`
- Registered in `src/commands/builtins.ts` with description `"Analyze and document your project with AI"` and usage `/genesis [path]`.
- Supports `--help`/`-h`/`help` (shows genesis help), `--force` (forces regeneration).
- Defaults `targetDir` to `process.cwd()`; validates it exists and is a directory.
- If not `force` and `.aether/docs` exists, prompts to use `/sync`.
- Requires config via `loadConfig(process.cwd())`; uses `createProvider`, `provider.ping()`, `scanContext`, `buildPlannerDigest`, `planDocs`, `buildSharedProjectContext`, `StepRunner`, `LineSpinner`, `chatWithRetry`, `buildDocsIndex`, `writeSnapshot`, `metaFromDefinition`.
- Writes docs to `join(targetDir, ".aether", doc.outputPath)` and index to `.aether/docs/README.md`.
- Concurrency controlled by env `AETHER_GEN_CONCURRENCY` (default 4); chat uses `temperature: 0.3`.

### `/sync`
- Registered in `src/commands/builtins.ts` with description `"Refresh only the docs affected by what changed since the last run"` and usage `/sync [path]`.
- Supports `--help`/`-h`/`help` (shows sync help).
- Defaults `targetDir` to `process.cwd()`; requires `loadSnapshot(targetDir)` at `.aether/settings/context.json`.
- Uses `diffFingerprint`, `hasChanges`, `getGitLog`, `planSync`, `buildSharedProjectContext`, `mergeDocMetas`, `buildDocsIndex`, `writeSnapshot`.
- Never deletes docs; merges via `mergeDocMetas(snapshot.docs, plan.add)`.

### `/exit` and `/clear`
- Both registered in `src/commands/builtins.ts`.
- `/exit` calls `process.exit(0)`.
- `/clear` writes `"\x1Bc"` to clear the screen.

## Command Dispatch Flow

```mermaid
flowchart TD
    A[src/cli/index.ts main] --> B[registerHelpCommand]
    A --> C[registerBuiltinCommands]
    A --> D[registerConfigCommand]
    A --> E[startChat]
    E --> F[user input]
    F --> G{starts with /}
    G -->|yes| H[registry.execute]
    H --> I[CommandRegistry routes to handler]
    G -->|no| J[respond in ui/prompt.ts]
    I --> K[/help, /config, /genesis, /sync, /exit, /clear]
```