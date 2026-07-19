# Onboarding to Aether

This guide is for you, a human developer who has already installed and run Aether and now wants to understand it well enough to change it without breaking things. It is the human counterpart to the machine-facing `AI_CONTEXT.md` that Aether itself can generate. Here we care about *why* the code is shaped the way it is, and where to poke when you need to.

## Why this project exists

Aether is an open-source CLI that turns a codebase into an "AI-native workspace." The README states the core problem plainly: AI coding assistants are only as good as the context they receive, and most repositories have outdated docs, hidden business rules, unknown architecture decisions, and poor onboarding. Aether's mission is to bridge that gap by building and maintaining an **AI-ready knowledge layer** for a project — not just generating one-off documentation, but treating understanding as the product.

The project's own philosophy frames Aether as a *universe*, not a tool. `genesis` is the moment a project is "born" into that ecosystem: structure first, then understanding, then intelligence. Other commands in that lifecycle (`sync`, `doctor`, `explain`, `export`) are described in the README as roadmap phases. Be clear about what is real: per the code and the README roadmap, `genesis` is implemented and is the primary command; `sync` is also registered and implemented in the command code; `doctor`, `explain`, `export`, the MCP server, and the VS Code extension are listed as *planned* and are **not** built yet. Do not write code or docs that assume those exist.

## Mental model

Think of Aether in two layers: a **static scanner** that reads your repository and builds a structured picture of it, and an **optional AI layer** that sends that picture to an LLM to write documentation.

The static side starts in `src/genesis/context.ts`. `scanContext(rootDir)` walks the target directory, skips ignored folders like `node_modules` and `.git`, and separates files into config files, vision files (like `README.md` or `CONTRIBUTING.md`), entry points, and source files. It produces a `ProjectContext` object. That object is the single mental anchor for everything downstream — if you understand `ProjectContext`, you understand what Aether "knows" about a repo.

From there, the flow for `genesis` is:

1. `scanContext` builds the context.
2. `buildPlannerDigest` (`src/genesis/digest.ts`) compresses that context into a short signal summary for the planner.
3. `planDocs` (`src/genesis/planner.ts`) asks the LLM (if configured) which documentation to produce, falling back to a core set if the model misbehaves.
4. `buildSharedProjectContext` (`src/genesis/scope.ts`) assembles the full prompt, distilling files via `distill.ts` if the context is over the budget.
5. The docs are generated from `DocDefinition`s in `src/genesis/docs.ts` and written under `.aether/docs/`.

The AI layer is deliberately provider-agnostic. `src/providers/types.ts` defines a small `LLMProvider` interface (`chat`, `chatStream`, `ping`). Today every provider is implemented as an `OpenAICompatibleProvider` (`src/providers/openai-compatible.ts`); the factory switches on the provider name but currently constructs the same compatible client for openai, gemini, anthropic, and openrouter. The config module (`src/config/index.ts`) holds the provider settings and persists them under `.aether/settings/config.json`.

The CLI itself is a chat loop. `src/cli/index.ts` registers commands, prints a banner or plays a startup animation depending on whether it's in a TTY, then calls `startChat()` in `src/ui/prompt.ts`. You type `/genesis`, `/sync`, `/config`, `/help`, and the `CommandRegistry` routes them.

## Where things live

A short map for the parts you'll touch most:

- **I want to add or change a documentation type** → `src/genesis/docs.ts` (the `DOC_DEFINITIONS` array and `DocDefinition` shape) and the matching prompt string in `src/prompts/`.
- **I want to change how a repo is scanned or what files matter** → `src/genesis/context.ts` (the `CONFIG_FILES`, `VISION_FILE_CANDIDATES`, `IGNORED_DIRS`, and `findEntryPoints` lists).
- **I want to add a CLI command** → `src/commands/` (register it in `builtins.ts`, `config.ts`, or a new file) and make sure it's registered from `src/cli/index.ts`.
- **I want to support a new LLM provider or change request behavior** → `src/providers/` (types, factory, openai-compatible client, retry wrapper).
- **I want to change config storage or validation** → `src/config/index.ts` and `src/config/scaffold.ts` (which writes `.gitignore` entries and the `.aether/README.md`).
- **I want to change the interactive UX** → `src/ui/prompt.ts`, `src/ui/steps.ts`, `src/ui/animation.ts`.
- **I want to change how the planner decides what to document** → `src/genesis/planner.ts` and `src/prompts/planner.ts`.

For the full layout and architecture narrative, see the generated `system-overview` and `folder-structure` docs; this guide intentionally does not duplicate them.

## Key decisions & the reasoning

- **Static analysis first, AI second.** The README is explicit: Aether scans with parsers and heuristics and needs no API key by default. AI is an optional enrichment. This is why `scanContext` and the digest/planner pipeline exist independently of any provider — you can run the skeleton without a key, and the code confirms `genesis` requires a config only when it actually calls the provider.
- **One `ProjectContext` object as the contract.** Nearly every genesis module imports `ProjectContext` from `context.ts`. This keeps the static model decoupled from LLM concerns. Don't casually rename or reshape its fields — `digest.ts`, `scope.ts`, `planner.ts`, and `docs.ts` all depend on it.
- **Provider abstraction with a single compatible implementation.** `LLMProvider` is a clean interface, but `factory.ts` currently maps all providers to `OpenAICompatibleProvider`. The anthropic branch even has a `TODO: different API format`. The reasoning (from README and config) is to support OpenAI, Anthropic, Gemini, and OpenRouter via one wire format where possible. If you "fix" this by special-casing a provider, you must preserve the existing `ping()`-via-`/models` behavior or `genesis` will break.
- **Config lives in `.aether/settings/config.json`, with a legacy fallback.** `config/index.ts` reads both the new path and the old `.aether/config.json`. `scaffold.ts` ensures the settings dir exists and adds `.aether/settings/config.json` to `.gitignore` so keys aren't committed. Don't move config elsewhere without updating both `getConfigPath` and `getLegacyConfigPath` and the scaffold's gitignore entry.
- **Prompts are separated from logic.** Every doc type has a constant prompt string in `src/prompts/` and is composed with `BASE_PROMPT`/`PROMPT_SUFFIX` (machine-facing) or `HUMAN_BASE_PROMPT`/`HUMAN_PROMPT_SUFFIX` (human-facing) in `docs.ts`. This mirrors Aether's own rule: vision files are the source of intent, and prompts carry the anti-hallucination contract. Editing a prompt changes output quality directly — treat those strings as product surface.
- **Distillation under a budget.** `scope.ts` uses `AETHER_DOC_CONTEXT_CHARS` (default 48,000) to decide whether to send the full context or distill via `distill.ts`. This keeps token use bounded. The distill step uses `temperature: 0` and retries via `providers/retry.ts`. Changing the budget or chunk math affects cost and completeness — verify against a real repo.

## Making your first change

A realistic small task: *add a new human-facing documentation type called "Runbook" that explains how to operate the project.*

1. In `src/prompts/`, create `runbook.ts` exporting `RUNBOOK_PROMPT` (a string with instructions, following the pattern of `getting-started.ts`).
2. In `src/prompts/index.ts`, add `RUNBOOK_PROMPT` to the re-exports.
3. In `src/genesis/docs.ts`, import it, then add a `DocDefinition` to `DOC_DEFINITIONS` — e.g. id `"runbook"`, `outputPath: "docs/guides/runbook.md"`, section `"Guides"`, and `buildPrompt` using `withHumanBase(context, RUNBOOK_PROMPT)` if it's human-facing.
4. If you want the planner to consider it, add its id to the known doc IDs referenced in `src/prompts/planner.ts` (the `PLANNER_PROMPT` lists them) — but note `CORE_IDS` in `planner.ts` controls the fallback set; you don't need to add it there unless you want it in the no-AI fallback.
5. Run it: `npm run dev` from the project root, then type `/genesis` in the chat loop (or `npm run build` and `node dist/cli/index.js`). Point it at a test repo or the aether repo itself.
6. Verify: check `.aether/docs/guides/runbook.md` was created and `.aether/docs/README.md` indexes it. Run `npm run typecheck` to confirm types hold.

That path uses only real, verified pieces — no planned features required.

## Gotchas

- **The README's "Supported providers" table lists Anthropic with `/config anthropic`, but the factory treats anthropic as OpenAI-compatible with a TODO.** Don't assume real Anthropic API behavior exists; it doesn't yet.
- **`sync` is implemented, not just planned.** The README roadmap shows `sync` as unchecked, but `builtins.ts` registers `/sync` and `src/genesis/sync.ts` + fingerprint diffing are present. Treat it as real, but note the README hasn't been updated to mark it done.
- **`CONTRIBUTING.md` describes a `src/analyzers/`, `src/generators/`, `src/core/`, `src/utils/` layout that does not exist in the code.** The actual tree is `cli/`, `commands/`, `config/`, `genesis/`, `prompts/`, `providers/`, `ui/`. Trust the code, not that doc's structure section.
- **`ProjectContext` fields are relied upon across genesis modules.** If you change `scanContext`'s output shape, `digest.ts`, `scope.ts`, and `planner.ts` will break silently or at type-check.
- **Provider calls go through `chatWithRetry` with exponential backoff.** The retry logger writes to `stdout`; if you change `providers/retry.ts`, you can affect user-visible output during generation.
- **`genesis` writes into `.aether/docs` and refuses to overwrite without `--force` if docs exist; it tells the user to use `/sync`.** If you test repeatedly, use `--force` or clear `.aether/docs`, or you'll be puzzled why nothing regenerates.
- **Config validation requires `apiKey`** (`validateConfig` in `config/index.ts`). Even though static-only mode is the default philosophy, the `genesis` command path calls `loadConfig` and `provider.ping()`, so a missing key will surface as a 401-style error caught by `formatError` in `builtins.ts`.