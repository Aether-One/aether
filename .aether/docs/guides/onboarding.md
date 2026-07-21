# Onboarding Guide for Aether

> **You've run the project. Now you need to understand it well enough to change it safely.**

---

## Why This Project Exists

AI coding assistants are powerful but fundamentally limited: **they only know what you tell them.** Most repositories have outdated docs, hidden business rules, unknown architecture decisions, and poor onboarding. Aether exists to bridge that gap by automatically building and maintaining an **AI-ready knowledge layer** for any codebase.

The product vision (from README.md and CONTRIBUTING.md) frames this as a **universe, not a tool**. Each command represents a phase in a project's lifecycle:

- **Genesis** → the project is born (analysis, documentation)
- **Sync** → the project evolves (continuous updates)
- **Doctor** → the project is healthy (validation) — *planned, not built*
- **Explain** → the project speaks (knowledge queries) — *planned, not built*
- **Export** → the project connects (AI integrations) — *planned, not built*

Today, **Genesis**, **Sync**, **Config**, **Clean**, **CleanCode**, and **Prompt** are implemented. The rest are roadmap items.

## Mental Model: How the Pieces Fit Together

Think of Aether as a **pipeline that turns a codebase into structured documentation**, with an interactive CLI wrapped around it.

### The Core Pipeline (Genesis)

 
scanContext() → buildPlannerDigest() → planDocs() → buildSharedProjectContext() → generate docs in parallel
     │                │                    │                    │                        │
     ▼                ▼                    ▼                    ▼                        ▼
ProjectContext   Digest string         DocDefinition[]      Shared context string    .aether/docs/*.md
 

1. **Scan** (`genesis/context.ts`) — Walks the target directory, collects config files, vision files (CONTEXT.md, ARCHITECTURE.md, etc.), entry points, and source files. Produces a `ProjectContext` with a directory tree and importance-ranked source files. Respects hard limits (`MAX_FILES_WALKED=10k`, `MAX_TOTAL_CHARS=2M`, `MAX_WALK_DEPTH=12`).

2. **Digest** (`genesis/digest.ts`) — Compresses the `ProjectContext` into a planner-friendly summary: file counts, detected signals (routes, domain logic, tests), and top-level symbols per file. This is what the LLM sees when deciding *what* docs to generate.

3. **Plan** (`genesis/planner.ts`) — Sends the digest to the LLM with `PLANNER_PROMPT`. The LLM returns a JSON array of doc IDs to generate (from a known catalog of 13) plus up to 5 custom docs. Six "core" docs are *always* generated: system-overview, folder-structure, tech-stack, ai-context, getting-started, onboarding. The rest are conditional on evidence.

4. **Shared Context** (`genesis/scope.ts`) — Builds a single context string used by *all* doc generations. If the prompt fits within `DOC_CONTEXT_BUDGET=48k` chars, it's used verbatim. Otherwise, source files are **distilled incrementally** (`genesis/distill.ts`): chunked, summarized by the LLM with caching (keyed by model + content hash), and reassembled. This is the most complex part of the codebase.

5. **Generate** — Each `DocDefinition` gets its own prompt (from `prompts/docs/*.ts`), the shared context is injected, and the LLM writes the markdown. Runs in parallel (`GEN_CONCURRENCY=4`).

### The Sync Pipeline

 
/sync reads snapshot → scanContext → diffFingerprint → planSync (LLM) → refresh/add docs → write new snapshot
 

- **Snapshot** (`genesis/sync.ts`) stores: git commit, file fingerprints (SHA256 + size), and metadata for each generated doc.
- **Diff** compares current fingerprints vs snapshot. Only changed files trigger doc updates.
- **PlanSync** asks the LLM which existing docs need refresh and which new catalog docs should be added.
- **Refresh** uses `DOC_UPDATE_INSTRUCTIONS` (smallest-change editing) or `SECTION_PATCH_INSTRUCTIONS` (section-level patches).

### CleanCode Pipeline

 
/cleancode review → scanContext → runHeuristics (static) → flaggedFiles → scanCleanCodeHybrid (AI) → report.md
 

- **Heuristics** (`genesis/cleancode-heuristics.ts`) — Fast static detectors for long functions, deep nesting, magic numbers, dead code, poor naming. Runs per paradigm (clean-code, SOLID, functional, Google-style).
- **Hybrid AI Review** (`genesis/cleancode.ts`) — If a provider is configured and reachable, flagged files are sent to the LLM with a paradigm-specific prompt (`buildCleanCodeScanPrompt`). Returns structured violations (file, line, severity, category, description, suggestion).
- **Report** — Markdown written to `.aether/clean/report.md` with summary table, per-file issues, and AI cleanup instructions.
- **Ignore & Paradigm** — Patterns stored in `.aether/settings/cleancode-ignore.json`; paradigm in `.aether/settings/cleancode-paradigm.json`.

### Prompt Pipeline

 
/prompt <intent> → scanContext → checkStaleness → buildDocsContext → OPTIMIZE_PROMPT (LLM) → .aether/prompts/<slug>.md
 

- **Staleness Check** — Compares current fingerprint vs saved snapshot; warns if docs are outdated.
- **Context Building** — Reads up to 24k chars from key docs (README, AI_CONTEXT, architecture) + directory tree (8k).
- **Optimization** — Single LLM call with `OPTIMIZE_PROMPT` + `buildOptimizePrompt` produces a file-referencing, convention-aware prompt for another AI assistant.
- **Output** — Saved with metadata header (intent, timestamp, provider/model, stale warning).

### Cost Estimation & Metering

- **Pricing** (`pricing/index.ts`) — Fetches live model pricing from OpenRouter (cached 24h) with a static fallback table for 10 common models. Returns per-token input/output costs.
- **Estimation** (`genesis/estimate.ts`) — Computes token counts and cost ranges for genesis, sync, and cleancode runs before any LLM calls. Used to show the user a cost estimate and prompt for confirmation.
- **Metering** (`providers/metered.ts`) — Wraps any `LLMProvider` to track actual token usage (prompt, completion, total) and call counts across the session. Falls back to estimation if the provider doesn't return usage.

### The CLI Shell

- **Command Registry** (`commands/registry.ts`) — Simple map of name → `{ description, usage, handler }`. Commands register themselves in `cli/index.ts` in a fixed order.
- **Interactive Chat** (`ui/prompt.ts`) — Readline-based REPL with `/` command dropdown (ANSI cursor tricks), free-text keyword matching, and rotating tips.
- **Progress UI** (`ui/steps.ts`) — `StepRunner` with pooled concurrency and per-step spinners; `LineSpinner` for single long-running tasks.
- **Startup** (`ui/animation.ts`) — Animated logo on TTY, static banner otherwise.
- **Cancellation** (`ui/cancel.ts`) — Raw-mode stdin listener for ESC/q/Ctrl+C; integrates with `AbortController` to cancel in-flight LLM calls.
- **Confirmation** (`ui/confirm.ts`) — Single-key (y/n) prompts with TTY raw mode; non-TTY falls back to default.
- **Cost Display** (`ui/cost.ts`) — Formats USD amounts and multi-line cost estimates with provider/model, token counts, and cost ranges.

### Configuration & Providers

- **Config Precedence** (`config/index.ts`): global default → global project entry → in-repo `.aether/config.json` → `AETHER_API_KEY` env var.
- **Providers** (`providers/factory.ts`) — All four (OpenAI, Anthropic, Gemini, OpenRouter) use `OpenAICompatibleProvider`. *There's a TODO in the code noting Anthropic's API format differs.*
- **OpenRouter Provider** (`providers/openrouter.ts`) — Extends `OpenAICompatibleProvider` and disables reasoning tokens via `providerParams()`.
- **Retry Logic** (`providers/retry.ts`) — Exponential backoff with special handling for 429 (rate limit): upgrades max retries, respects `Retry-After` headers, minimum 15s base delay.

## Where Things Live: "I Want to Change X → Look in Y"

| Goal | Primary File(s) | Notes |
|------|----------------|-------|
| Add a new built-in command | `commands/builtins.ts` + `commands/registry.ts` | Register in `registerBuiltinCommands()`; follow `/genesis` pattern |
| Add a new document type (catalog) | `genesis/docs.ts` (add to `DOC_DEFINITIONS`), `prompts/docs/` (new prompt), `genesis/planner.ts` (add to conditional IDs) | Must update planner's known catalog IDs |
| Modify an existing doc's prompt | `prompts/docs/<name>.ts` | Prompts are pure string templates; imported in `genesis/docs.ts` |
| Change how context is scanned | `genesis/context.ts` | `CONFIG_FILES`, `VISION_FILE_CANDIDATES`, `SOURCE_EXTENSIONS`, `IGNORED_DIRS` are constants at top |
| **Manage excluded paths** | `genesis/exclude.ts` + `commands/exclude.ts` | `loadExcludes()`, `addExclude()`, `removeExclude()`, `isExcluded()`; stored in `.aether/settings/exclude.json` |
| Adjust distillation behavior | `genesis/distill.ts` | `chunkBudget`, `DISTILL_CONCURRENCY`, `distillInstruction()` |
| Change planner logic | `genesis/planner.ts` | `CORE_IDS`, `MAX_CUSTOM_DOCS`, `parsePlan()`, `extractJsonArray()` |
| Modify sync diffing/refresh | `genesis/sync.ts` | `diffFingerprint`, `planSync`, `refreshDoc`, `formatChanges` |
| Add a new LLM provider | `providers/factory.ts` (add case), `config/types.ts` (add to `AetherConfig.provider` union) | All current providers route through `OpenAICompatibleProvider` |
| Change config precedence/loading | `config/index.ts` | `loadConfig()`, `saveConfig()`, `projectId()`, `getProjectCacheDir()` |
| Tweak CLI UX (colors, spinner, tips) | `ui/theme.ts`, `ui/steps.ts`, `ui/prompt.ts` | `TIPS` array in `prompt.ts`; `SPINNER_FRAMES` in `steps.ts` |
| Change global cache/config location | `config/index.ts` | `getGlobalDir()` → `~/.aether` |
| Modify cost estimation logic | `genesis/estimate.ts` | Token ratios, output multipliers, distill thresholds |
| Change pricing source/fallback | `pricing/index.ts` | OpenRouter fetch, static table, cache TTL |
| Adjust metering/usage tracking | `providers/metered.ts` | `UsageTotals`, `estimateTokens()` fallback |
| Customize cancellation behavior | `ui/cancel.ts` | `watchCancelKey()` key bindings |
| Change confirmation UX | `ui/confirm.ts` | `promptConfirm()` fallback logic |
| Format cost display differently | `ui/cost.ts` | `formatUSD()`, `formatEstimate()` |
| **Modify clean-code heuristics** | `genesis/cleancode-heuristics.ts` | `LONG_FUNCTION_LINES`, `DEEP_NESTING_LEVELS`, detectors per paradigm |
| **Change clean-code AI prompt** | `prompts/pipeline/cleancode.ts` | `PARADIGMS`, `buildCleanCodeScanPrompt()` |
| **Adjust clean-code hybrid flow** | `genesis/cleancode.ts` | `scanCleanCodeHybrid`, `flaggedFiles`, `buildCleanCodeMarkdown` |
| **Manage clean-code ignore/paradigm** | `genesis/cleancode.ts` + `commands/cleancode.ts` | `loadCleanCodeIgnore`, `addCleanCodeIgnorePattern`, `loadCleanCodeParadigm`, `setCleanCodeParadigm` |
| **Modify prompt optimization** | `prompts/pipeline/optimize.ts` | `OPTIMIZE_PROMPT`, `buildOptimizePrompt()` |
| **Change prompt staleness check** | `commands/prompt.ts` | `checkStaleness`, `buildDocsContext`, `parseOptimized` |
| **Adjust prompt output location** | `commands/prompt.ts` | `uniquePromptPath`, `composeFile` (`.aether/prompts/`) |

## Key Decisions & The Reasoning

| Decision | Why | Can It Change? |
|----------|-----|----------------|
| **Static analysis first, AI second** | Works without API keys; reduces token costs; AI only for deep understanding (business logic, architecture narrative) | Core philosophy — unlikely to change |
| **Single `OpenAICompatibleProvider` for all 4 providers** | OpenAI, Gemini, OpenRouter share OpenAI-compatible APIs; Anthropic *mostly* does (TODO notes format differences) | Anthropic may need a dedicated provider later |
| **Distillation with per-model caching** | Context windows are small; re-distilling unchanged files on every run is wasteful. Cache keyed by `model + content hash`. | Cache invalidation is tied to model — changing model clears cache |
| **Snapshot-based sync (git commit + fingerprints)** | Git history gives semantic change context; fingerprints detect content changes without re-reading all files | Solid foundation; `planSync` uses LLM to interpret *which* docs are affected |
| **Command registry pattern (not a framework)** | Zero dependencies, explicit registration order, easy to add commands | Works well; no need for Commander.js or similar |
| **Global config at `~/.aether/config.json` with per-project entries** | API keys stay out of repo; multiple projects share one global config; project ID = `basename-sha1(path)[:12]` | Stable; `projectId()` is used for cache isolation too |
| **No test suite** | Not in `package.json`, no test files in structure | **This is a gap** — adding tests would be high-value |
| **TypeScript strict mode, ESM, Node 20+** | Modern baseline; `tsconfig.json` enforces strictness | Non-negotiable for this codebase |
| **Cost estimation before every AI run** | Users see a cost range (low/high) and must confirm unless `--yes`; prevents surprise bills | Core UX — unlikely to change |
| **Metered provider wraps all LLM calls** | Tracks actual usage across genesis/sync; falls back to estimation if provider omits usage | Stable; enables post-run cost reporting |
| **OpenRouter as pricing source** | Single source for 100+ models; 24h cache avoids rate limits; static fallback for offline | Could add more sources if needed |
| **Cancellation via raw stdin + AbortController** | Works in TTY; propagates to in-flight `chat()`/`chatStream()` calls | Stable; `watchCancelKey()` is reusable |
| **Single-key confirmation (y/n/ESC)** | Fast, no Enter required; non-TTY falls back to default | Stable; `promptConfirm()` is reusable |
| **Heuristics-first clean-code review** | Fast static scan filters files before expensive AI call; paradigm-specific detectors keep it focused | Core to cleancode — unlikely to change |
| **Paradigm-driven AI prompts** | Clean Code, SOLID, Functional, Google-style each have distinct violation categories; prompt built per paradigm | Extensible — new paradigms can be added to `PARADIGMS` |
| **Prompt optimization as a separate pipeline** | Generates prompts for *other* AIs, not for Aether itself; uses project knowledge base as context | New capability — may evolve with use cases |
| **Staleness warning before prompt generation** | Prevents generating optimized prompts from outdated docs; compares fingerprint vs snapshot | Core safety — unlikely to change |

## Making Your First Change: Walkthrough

**Task:** *Add a new "Security" document to the Architecture section that documents authentication, authorization, and data protection patterns detected in the codebase.*

### 1. Create the Prompt
**File:** `src/prompts/docs/security.ts`
 typescript
export const SECURITY_PROMPT = `Generate a Security Overview document...
- Authentication mechanisms (JWT, sessions, API keys, OAuth)
- Authorization patterns (RBAC, ABAC, middleware, guards)
- Data protection (encryption at rest/in transit, PII handling)
- Input validation & sanitization
- Audit logging
Only document patterns explicitly found in the code.`;
 

### 2. Register the Prompt
**File:** `src/prompts/index.ts`
 typescript
export { SECURITY_PROMPT } from "./docs/security.js";
 

### 3. Add the DocDefinition
**File:** `src/genesis/docs.ts`
 typescript
import { SECURITY_PROMPT } from "../prompts/index.js";

// In DOC_DEFINITIONS array, after DIAGRAMS:
{
  id: "security",
  outputPath: "architecture/security.md",
  label: "Security Overview",
  title: "Security Overview",
  section: "Architecture",
  summary: "Authentication, authorization, and data protection patterns",
  prompt: SECURITY_PROMPT,
}
 

### 4. Make It Conditionally Planned
**File:** `src/genesis/planner.ts`
 typescript
// In PLANNER_PROMPT (the string constant), add to "Conditional known IDs":
// - security (if auth middleware, JWT handling, RBAC, encryption, or audit logging detected)
 

### 5. Verify It Works
 bash
npm run dev
# In the chat:
/genesis /path/to/test/project
 
Check `.aether/docs/architecture/security.md` is generated. Run `/sync` after adding auth code to see it refresh.

### 6. Type Check & Build
 bash
npm run typecheck
npm run build
 

---

**Task:** *Add a new clean-code paradigm (e.g., "pragmatic") that focuses on practical maintainability over dogma.*

### 1. Define the Paradigm
**File:** `src/prompts/pipeline/cleancode.ts`
 typescript
// In PARADIGMS record, add:
"pragmatic": {
  label: "Pragmatic",
  focus: "Practical maintainability — favor clarity, avoid premature abstraction, tolerate duplication over wrong abstraction",
  categories: "premature-abstraction | unclear-intent | over-engineering | missing-error-handling | inconsistent-pattern | other",
}
 

### 2. Add to Type Union
**File:** `src/genesis/types.ts`
 typescript
export type CleanCodeParadigm = "clean-code" | "solid" | "functional" | "google-style" | "pragmatic";
 

### 3. Add Heuristic Detectors
**File:** `src/genesis/cleancode-heuristics.ts`
 typescript
// In runHeuristics(), add case for "pragmatic":
case "pragmatic":
  return [
    ...detectLongFunctions(file),
    ...detectPoorNaming(file),
    ...detectDeadCode(file),
  ];
 

### 4. Update Paradigm Helpers
**File:** `src/prompts/pipeline/cleancode.ts`
 typescript
// isCleanCodeParadigm() in cleancode.ts and listParadigms() will automatically include it
 

### 5. Verify
 bash
npm run dev
/cleancode paradigm pragmatic
/cleancode review
 

---

**Task:** *Change the prompt optimization to include test file patterns in the generated prompt.*

### 1. Modify the Optimization Prompt
**File:** `src/prompts/pipeline/optimize.ts`
 typescript
// In OPTIMIZE_PROMPT, add instruction:
// - Include test file patterns and conventions (e.g., *.test.ts, __tests__/, vitest/jest)
 

### 2. Adjust Context Building
**File:** `src/commands/prompt.ts`
 typescript
// In buildDocsContext(), ensure test-related docs are included if they exist
 

### 3. Verify
 bash
npm run dev
/prompt "add a new API endpoint with tests"
 
Check `.aether/prompts/<slug>.md` references test conventions.

## Gotchas: Non-Obvious Things That Trip People Up

1. **Anthropic provider is a TODO** — `providers/factory.ts` routes Anthropic through `OpenAICompatibleProvider` with a comment: `// TODO: Anthropic uses a different API format`. If you test with Anthropic, expect breakage.

2. **Distillation cache is per-model** — Switching `config.model` invalidates the entire cache. The cache file lives at `~/.aether/cache/<project-id>/distill-cache.json`.

3. **Config precedence is subtle** — `loadConfig()` merges: global default → global project entry → in-repo `.aether/config.json` → `AETHER_API_KEY` env. The *first* saved config becomes the global default. `saveConfig()` writes to global file only.

4. **No tests exist** — `package.json` has no test script, no test files in `src/`. Any refactor is manual verification only. Adding a test harness would be a major contribution.

5. **Command registration order matters** — In `cli/index.ts`, commands register in this sequence: `help`, `builtins`, `config`, `clean`, `cleancode`, `exclude`, `prompt`. The registry is a `Map`; later registrations with same name would overwrite (but none do).

6. **Free-text in chat is keyword-matched, not LLM-powered** — `ui/prompt.ts` `respond()` matches lowercase input against hardcoded keyword arrays (`help|ajuda|comando`, `genesis|analisa|documenta`, etc.). It's not an AI chat.

7. **`/genesis` refuses to overwrite without `--force`** — If `.aether/docs` exists, it tells you to use `/sync` instead. This is intentional (protects user work).

8. **File walking has hard limits** — `MAX_FILES_WALKED=10_000`, `MAX_TOTAL_CHARS=2_000_000`, `MAX_WALK_DEPTH=12`. Large monorepos will hit these. They're env-overridable via `genesis/constants.ts` (`envInt()`).

9. **Snapshot stores git commit, not branch** — `getGitInfo()` captures `HEAD` commit and branch name, but `planSync` uses `git log <sinceCommit>..HEAD`. If you rewrite history, sync may miss changes.

10. **Custom docs are limited to 5** — `MAX_CUSTOM_DOCS = 5` in `planner.ts`. The planner can propose more but they're truncated.

11. **Cost estimation uses heuristics, not exact counts** — `estimateGenesis()`, `estimateSync()`, and `estimateCleanCode()` approximate tokens from chars (÷4), apply output multipliers (0.7–1.3×), and assume distillation when context exceeds budget. Actual usage may differ.

12. **Pricing cache is 24h** — `pricing/index.ts` caches OpenRouter model list for 24h. New models or price changes won't reflect until cache expires or is manually cleared (`/clean cache`).

13. **Metered provider estimates tokens if provider omits usage** — `estimateTokens()` uses a rough 4 chars/token heuristic. For accurate post-run costs, use providers that return `usage` in responses.

14. **Cancellation only works in TTY** — `watchCancelKey()` enables raw mode on stdin; if not a TTY, ESC/q/Ctrl+C are not captured. The `AbortController` signal is still passed to LLM calls but cannot be triggered interactively.

15. **Confirmation defaults to `true` in non-TTY** — `promptConfirm()` returns the fallback (default `true`) when stdin is not a TTY. Scripts piping input will auto-confirm unless you pass `--yes` explicitly.

16. **Excluded paths are respected during scan and sync** — `genesis/context.ts` and `genesis/sync.ts` both call `isExcluded()` from `genesis/exclude.ts`. Add exclusions via `/exclude <path>` or type `@` in the prompt to pick from a dropdown. Exclusions persist in `.aether/settings/exclude.json` per project.

17. **Clean-code review requires a configured provider for AI analysis** — Heuristics run always; hybrid AI review only runs if `loadConfig()` returns a valid provider and `ping()` succeeds. Use `--yes` to skip cost confirmation.

18. **Clean-code ignore patterns are globs, not regexes** — `matchesPattern()` converts `**` → `.*`, `*` → `[^/]*`, `?` → `.`. Stored in `.aether/settings/cleancode-ignore.json`.

19. **Prompt optimization reads from `.aether/docs/`, not source files directly** — `buildDocsContext()` loads up to 24k chars from key docs + 8k from directory tree. If docs are stale, the optimized prompt may miss recent changes (staleness warning is shown).

20. **Prompt output goes to `.aether/prompts/`, not the chat** — `/prompt` writes a markdown file with metadata header; it does not print the optimized prompt to stdout.

## Final Note

Aether is **early-stage**. The implemented surface (genesis, sync, config, clean) is solid and usable. The unimplemented commands (doctor, explain, export, MCP, VS Code) are where the product vision expands. If you're contributing, start by understanding the **genesis → distill → plan → generate** flow — that's the engine. Everything else (CLI, config, sync, UI) serves it.
