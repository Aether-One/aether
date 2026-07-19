# System Diagrams

Based on the provided codebase, here are the three system diagrams using Mermaid syntax.

---

## 1. Component Diagram

```mermaid
graph TB
    %% CLI Entry Point
    CLI[src/cli/index.ts<br/>main()]

    %% Command System
    Registry[src/commands/registry.ts<br/>CommandRegistry]
    HelpCmd[src/commands/help.ts<br/>registerHelpCommand]
    BuiltinsCmd[src/commands/builtins.ts<br/>registerBuiltinCommands]
    ConfigCmd[src/commands/config.ts<br/>registerConfigCommand]
    CleanCmd[src/commands/clean.ts<br/>registerCleanCommand]

    %% Config Module
    ConfigMod[src/config/index.ts<br/>loadConfig/saveConfig/validateConfig]
    ConfigTypes[src/config/types.ts<br/>AetherConfig]
    ConfigReadme[src/config/readme.ts<br/>AETHER_README]
    ConfigScaffold[src/config/scaffold.ts<br/>ensureProjectReadme]

    %% Genesis Pipeline
    GenConstants[src/genesis/constants.ts<br/>Constants]
    GenContext[src/genesis/context.ts<br/>scanContext/buildPrompt]
    GenDigest[src/genesis/digest.ts<br/>buildPlannerDigest]
    GenDistill[src/genesis/distill.ts<br/>distillFilesIncremental]
    GenFingerprint[src/genesis/fingerprint.ts<br/>buildFingerprint/getGitInfo]
    GenScope[src/genesis/scope.ts<br/>buildSharedProjectContext]
    GenPlanner[src/genesis/planner.ts<br/>planDocs/parsePlan]
    GenSync[src/genesis/sync.ts<br/>planSync/refreshDoc/writeSnapshot]
    GenDocs[src/genesis/docs.ts<br/>DOC_DEFINITIONS/buildDocsIndex]
    GenTypes[src/genesis/types.ts<br/>Type Definitions]

    %% Prompts
    PromptsBase[src/prompts/base.ts<br/>BASE_PROMPT/PROMPT_SUFFIX]
    PromptsIndex[src/prompts/index.ts<br/>Re-exports]
    PromptsDocs[src/prompts/docs/*.ts<br/>13 Doc Prompts]
    PromptsPipeline[src/prompts/pipeline/*.ts<br/>Planner/Sync Prompts]

    %% Providers
    ProvTypes[src/providers/types.ts<br/>LLMProvider Interface]
    ProvFactory[src/providers/factory.ts<br/>createProvider]
    ProvOpenAI[src/providers/openai-compatible.ts<br/>OpenAICompatibleProvider]
    ProvRetry[src/providers/retry.ts<br/>chatWithRetry]

    %% UI
    UIAnimation[src/ui/animation.ts<br/>playStartupAnimation/printBanner]
    UIPrompt[src/ui/prompt.ts<br/>startChat/REPL]
    UISteps[src/ui/steps.ts<br/>StepRunner/LineSpinner]
    UITheme[src/ui/theme.ts<br/>Theme Constants]

    %% Util
    UtilEnv[src/util/env.ts<br/>envInt]

    %% Config Files
    PkgJson[package.json]
    TsConfig[tsconfig.json]
    SeaConfig[sea-config.json]

    %% Relationships
    CLI --> Registry
    CLI --> UIAnimation
    CLI --> UIPrompt
    CLI --> HelpCmd
    CLI --> BuiltinsCmd
    CLI --> ConfigCmd
    CLI --> CleanCmd

    HelpCmd --> Registry
    BuiltinsCmd --> Registry
    ConfigCmd --> Registry
    CleanCmd --> Registry

    ConfigCmd --> ConfigMod
    ConfigMod --> ConfigTypes
    ConfigMod --> ConfigReadme
    ConfigMod --> ConfigScaffold
    ConfigScaffold --> ConfigReadme

    GenConstants --> GenContext
    GenConstants --> GenDistill
    GenConstants --> GenScope
    GenConstants --> GenPlanner
    GenConstants --> GenSync

    GenContext --> GenDigest
    GenContext --> GenScope
    GenContext --> GenFingerprint

    GenDigest --> GenPlanner
    GenPlanner --> PromptsIndex
    GenPlanner --> ProvFactory
    GenPlanner --> GenDocs

    GenDistill --> ProvFactory
    GenDistill --> ProvRetry
    GenDistill --> GenConstants

    GenScope --> GenDistill
    GenScope --> ConfigMod
    GenScope --> GenConstants

    GenSync --> GenFingerprint
    GenSync --> GenPlanner
    GenSync --> GenDocs
    GenSync --> ProvFactory
    GenSync --> ProvRetry
    GenSync --> PromptsIndex

    GenDocs --> PromptsDocs
    GenDocs --> PromptsPipeline

    ProvFactory --> ProvTypes
    ProvFactory --> ProvOpenAI
    ProvOpenAI --> ProvTypes
    ProvRetry --> ProvTypes
    ProvRetry --> UITheme

    UIPrompt --> Registry
    UIPrompt --> UITheme
    UISteps --> UITheme
    UIAnimation --> UITheme

    GenConstants --> UtilEnv
    GenDistill --> UtilEnv
    GenScope --> UtilEnv
    GenPlanner --> UtilEnv
    GenSync --> UtilEnv

    CLI --> PkgJson
    CLI --> TsConfig
    CLI --> SeaConfig
```

---

## 2. Data Flow Diagram

```mermaid
flowchart TD
    %% Input Sources
    UserInput[User Input\nCLI Args / REPL]
    ProjectFiles[Project Files\nSource/Config/Vision]
    EnvVars[Environment Variables\nAETHER_*, OPENAI_API_KEY, etc.]
    GlobalConfig[~/.aether/config.json]
    GitRepo[Git Repository\ncommits/branches/status]

    %% CLI Entry & Command Routing
    CLIEntry[src/cli/index.ts:main()]
    CmdRegistry[src/commands/registry.ts:CommandRegistry]
    ConfigCmd[src/commands/config.ts:/config handler]
    CleanCmd[src/commands/clean.ts:/clean handler]
    GenesisCmd[/genesis handler\n(not in commands/ yet)]
    SyncCmd[/sync handler\n(not in commands/ yet)]

    %% Config Flow
    ConfigLoad[src/config/index.ts:loadConfig]
    ConfigSave[src/config/index.ts:saveConfig]
    ConfigValidate[src/config/index.ts:validateConfig]
    ConfigDefaults[src/config/index.ts:DEFAULT_CONFIGS]

    %% Genesis Pipeline
    ScanContext[src/genesis/context.ts:scanContext]
    BuildPrompt[src/genesis/context.ts:buildPrompt]
    PlannerDigest[src/genesis/digest.ts:buildPlannerDigest]
    PlanDocs[src/genesis/planner.ts:planDocs]
    DistillFiles[src/genesis/distill.ts:distillFilesIncremental]
    DistillSingle[src/genesis/distill.ts:distillSingle]
    BuildSharedCtx[src/genesis/scope.ts:buildSharedProjectContext]
    GenDocs[src/genesis/docs.ts:DOC_DEFINITIONS]
    WriteDocs[Write .aether/docs/*.md]
    WriteIndex[src/genesis/docs.ts:buildDocsIndex]

    %% Sync Pipeline
    LoadSnapshot[src/genesis/sync.ts:loadSnapshot]
    DiffFingerprint[src/genesis/sync.ts:diffFingerprint]
    PlanSync[src/genesis/sync.ts:planSync]
    RefreshDoc[src/genesis/sync.ts:refreshDoc]
    ApplyPatch[src/genesis/sync.ts:applySectionPatch]
    WriteSnapshot[src/genesis/sync.ts:writeSnapshot]

    %% Fingerprinting & Git
    BuildFingerprint[src/genesis/fingerprint.ts:buildFingerprint]
    GetGitInfo[src/genesis/fingerprint.ts:getGitInfo]
    GetGitLog[src/genesis/fingerprint.ts:getGitLog]

    %% LLM Provider Flow
    ProviderFactory[src/providers/factory.ts:createProvider]
    OpenAIProvider[src/providers/openai-compatible.ts:OpenAICompatibleProvider]
    ChatRetry[src/providers/retry.ts:chatWithRetry]
    ChatStream[src/providers/openai-compatible.ts:chatStream]

    %% Prompts
    BasePrompt[src/prompts/base.ts:BASE_PROMPT]
    PlannerPrompt[src/prompts/pipeline/planner.ts:PLANNER_PROMPT]
    SyncPlannerPrompt[src/prompts/pipeline/sync.ts:SYNC_PLANNER_PROMPT]
    DocPrompts[src/prompts/docs/*.ts:13 Doc Prompts]

    %% UI
    StartupAnim[src/ui/animation.ts:playStartupAnimation]
    StartChat[src/ui/prompt.ts:startChat]
    StepRunner[src/ui/steps.ts:StepRunner]

    %% Data Flow Connections
    UserInput --> CLIEntry
    CLIEntry --> StartupAnim
    CLIEntry --> CmdRegistry
    CLIEntry --> StartChat

    StartChat --> CmdRegistry
    CmdRegistry --> ConfigCmd
    CmdRegistry --> CleanCmd
    CmdRegistry --> GenesisCmd
    CmdRegistry --> SyncCmd

    %% Config Flow
    ConfigCmd --> ConfigLoad
    ConfigLoad --> GlobalConfig
    ConfigLoad --> EnvVars
    ConfigLoad --> ConfigDefaults
    ConfigCmd --> ConfigValidate
    ConfigCmd --> ConfigSave
    ConfigSave --> GlobalConfig

    %% Genesis Flow
    GenesisCmd --> ScanContext
    ScanContext --> ProjectFiles
    ScanContext --> GitRepo
    ScanContext --> BuildPrompt
    BuildPrompt --> PlannerDigest
    PlannerDigest --> PlanDocs
    PlanDocs --> ProviderFactory
    PlanDocs --> PlannerPrompt
    PlanDocs --> BasePrompt
    PlanDocs --> GenDocs
    PlanDocs --> DistillFiles
    DistillFiles --> DistillSingle
    DistillSingle --> ChatRetry
    ChatRetry --> OpenAIProvider
    OpenAIProvider --> ChatStream
    BuildSharedCtx --> DistillFiles
    BuildSharedCtx --> GenDocs
    BuildSharedCtx --> WriteDocs
    WriteDocs --> WriteIndex

    %% Sync Flow
    SyncCmd --> LoadSnapshot
    LoadSnapshot --> GlobalConfig
    SyncCmd --> BuildFingerprint
    BuildFingerprint --> ProjectFiles
    BuildFingerprint --> DiffFingerprint
    DiffFingerprint --> PlanSync
    PlanSync --> ProviderFactory
    PlanSync --> SyncPlannerPrompt
    PlanSync --> BasePrompt
    PlanSync --> GetGitLog
    PlanSync --> RefreshDoc
    RefreshDoc --> ChatRetry
    RefreshDoc --> ApplyPatch
    RefreshDoc --> WriteSnapshot
    WriteSnapshot --> GlobalConfig

    %% Provider Config
    ProviderFactory --> ConfigLoad
    ProviderFactory --> OpenAIProvider
    ChatRetry --> OpenAIProvider
    ChatRetry --> UITheme[src/ui/theme.ts]

    %% Constants & Env
    GenConstants[src/genesis/constants.ts] --> ScanContext
    GenConstants --> DistillFiles
    GenConstants --> BuildSharedCtx
    GenConstants --> PlanDocs
    GenConstants --> PlanSync
    UtilEnv[src/util/env.ts:envInt] --> GenConstants
```

---

## 3. Sequence Diagrams

### 3.1 CLI Startup & Command Execution

```mermaid
sequenceDiagram
    participant User
    participant CLI as src/cli/index.ts:main()
    participant Anim as src/ui/animation.ts
    participant Registry as src/commands/registry.ts
    participant Chat as src/ui/prompt.ts:startChat()
    participant ConfigCmd as src/commands/config.ts
    participant ConfigMod as src/config/index.ts
    participant ProviderFactory as src/providers/factory.ts

    User->>CLI: node dist/cli/index.js [args]
    CLI->>CLI: Read __AETHER_VERSION__
    alt --version or -v
        CLI->>User: Print version & exit
    else
        CLI->>Registry: registerHelpCommand()
        CLI->>Registry: registerBuiltinCommands()
        CLI->>Registry: registerConfigCommand()
        CLI->>Registry: registerCleanCommand()
        CLI->>CLI: Check process.stdin.isTTY
        alt Interactive TTY && !--no-animation
            CLI->>Anim: playStartupAnimation()
        else
            CLI->>Anim: printBanner()
        end
        CLI->>Chat: startChat()
        Chat->>Chat: Create readline interface
        Chat->>Chat: Setup keypress/line handlers
        loop REPL Loop
            User->>Chat: Type input
            alt Input starts with /
                Chat->>Registry: execute(input)
                Registry->>ConfigCmd: handler(args) [if /config]
                ConfigCmd->>ConfigMod: loadConfig(cwd)
                ConfigMod->>ConfigMod: Read ~/.aether/config.json
                ConfigMod->>ConfigMod: Merge with env/project config
                ConfigMod-->>ConfigCmd: AetherConfig | null
                ConfigCmd->>ConfigMod: saveConfig(cwd, config) [if setting]
                ConfigMod->>ConfigMod: Write ~/.aether/config.json
                ConfigCmd-->>Registry: void
                Registry-->>Chat: true (handled)
            else Chat message
                Chat->>Chat: respond(message) [keyword-based]
            end
        end
    end
```

### 3.2 Genesis Pipeline (Conceptual Flow from Genesis Modules)

```mermaid
sequenceDiagram
    participant User
    participant GenesisCmd as /genesis handler (future)
    participant ScanCtx as src/genesis/context.ts:scanContext()
    participant Digest as src/genesis/digest.ts:buildPlannerDigest()
    participant Planner as src/genesis/planner.ts:planDocs()
    participant ProviderFactory as src/providers/factory.ts
    participant OpenAIProvider as src/providers/openai-compatible.ts
    participant Retry as src/providers/retry.ts:chatWithRetry()
    participant Distill as src/genesis/distill.ts:distillFilesIncremental()
    participant Scope as src/genesis/scope.ts:buildSharedProjectContext()
    participant Docs as src/genesis/docs.ts
    participant Fingerprint as src/genesis/fingerprint.ts
    participant Sync as src/genesis/sync.ts:writeSnapshot()

    User->>GenesisCmd: /genesis
    GenesisCmd->>ScanCtx: scanContext(rootDir)
    ScanCtx->>ScanCtx: Walk directory (MAX_FILES_WALKED, MAX_WALK_DEPTH)
    ScanCtx->>ScanCtx: Read config/vision/entry/source files (MAX_FILE_SIZE, MAX_TOTAL_CHARS)
    ScanCtx->>ScanCtx: Build directoryTree
    ScanCtx-->>GenesisCmd: ProjectContext
    GenesisCmd->>Digest: buildPlannerDigest(context)
    Digest-->>GenesisCmd: Planner Digest String
    GenesisCmd->>Planner: planDocs(digest, provider, model)
    Planner->>Planner: Build prompt (BASE_PROMPT + digest + PLANNER_PROMPT + PROMPT_SUFFIX)
    Planner->>ProviderFactory: createProvider(config)
    ProviderFactory->>OpenAIProvider: new OpenAICompatibleProvider(baseUrl, apiKey, timeout)
    Planner->>Retry: chatWithRetry(provider, request, options)
    loop Retry up to 3 attempts
        Retry->>OpenAIProvider: chat(request)
        OpenAIProvider->>OpenAIProvider: POST /chat/completions (stream)
        OpenAIProvider-->>Retry: ChatResponse
        alt Rate limit (429)
            Retry->>Retry: Wait with exponential backoff (RATE_LIMIT_OPTIONS)
        else Success
            Retry-->>Planner: ChatResponse
        end
    end
    Planner->>Planner: parsePlan(response) -> DocDefinition[]
    Planner-->>GenesisCmd: DocDefinition[]
    GenesisCmd->>Distill: distillFilesIncremental(files, provider, model, budget, cache)
    Distill->>Distill: Load distill-cache.json from ~/.aether/cache/{projectId}/
    loop For each stale file (concurrent, DISTILL_CONCURRENCY)
        Distill->>Retry: chatWithRetry(provider, distillPrompt)
        Retry->>OpenAIProvider: chat(request)
        OpenAIProvider-->>Retry: ChatResponse
        Retry-->>Distill: notes
    end
    Distill->>Distill: Save updated distill-cache.json
    Distill-->>GenesisCmd: { notes, cache }
    GenesisCmd->>Scope: buildSharedProjectContext(context, provider, model)
    Scope->>Scope: If prompt > DOC_CONTEXT_BUDGET, use distilled notes
    Scope-->>GenesisCmd: Shared Context String
    GenesisCmd->>Docs: Generate each DocDefinition using shared context + doc prompt
    loop For each doc (concurrent, GEN_CONCURRENCY)
        Docs->>Retry: chatWithRetry(provider, docPrompt)
        Retry->>OpenAIProvider: chat(request)
        OpenAIProvider-->>Retry: ChatResponse
        Retry-->>Docs: Markdown content
    end
    Docs->>Docs: Write .aether/docs/*.md
    Docs->>Docs: buildDocsIndex() -> .aether/docs/README.md
    GenesisCmd->>Fingerprint: buildFingerprint(context)
    Fingerprint-->>GenesisCmd: Record<string, FileFingerprint>
    GenesisCmd->>Fingerprint: getGitInfo(rootDir)
    Fingerprint-->>GenesisCmd: GitInfo
    GenesisCmd->>Sync: writeSnapshot(rootDir, meta, context, docs)
    Sync->>Sync: Write .aether/settings/context.json (Snapshot)
    Sync-->>GenesisCmd: void
    GenesisCmd-->>User: Genesis complete
```

### 3.3 Sync Pipeline (Conceptual Flow from Sync Module)

```mermaid
sequenceDiagram
    participant User
    participant SyncCmd as /sync handler (future)
    participant LoadSnap as src/genesis/sync.ts:loadSnapshot()
    participant Fingerprint as src/genesis/fingerprint.ts
    participant Diff as src/genesis/sync.ts:diffFingerprint()
    participant PlanSync as src/genesis/sync.ts:planSync()
    participant ProviderFactory as src/providers/factory.ts
    participant OpenAIProvider as src/providers/openai-compatible.ts
    participant Retry as src/providers/retry.ts:chatWithRetry()
    participant RefreshDoc as src/genesis/sync.ts:refreshDoc()
    participant ApplyPatch as src/genesis/sync.ts:applySectionPatch()
    participant WriteSnap as src/genesis/sync.ts:writeSnapshot()

    User->>SyncCmd: /sync
    SyncCmd->>LoadSnap: loadSnapshot(rootDir)
    LoadSnap->>LoadSnap: Read .aether/settings/context.json
    LoadSnap-->>SyncCmd: Snapshot | null
    SyncCmd->>Fingerprint: buildFingerprint(currentContext)
    Fingerprint-->>SyncCmd: Current Fingerprint
    SyncCmd->>Diff: diffFingerprint(prevFingerprint, currentContext)
    Diff-->>SyncCmd: FileDiff {added, modified, deleted}
    alt No changes
        SyncCmd-->>User: No changes since last sync
    else Has changes
        SyncCmd->>Fingerprint: getGitLog(rootDir, sinceCommit)
        Fingerprint-->>SyncCmd: Commit log string
        SyncCmd->>PlanSync: planSync(digest, diff, existingDocs, gitLog, provider, model)
        PlanSync->>PlanSync: Build prompt (BASE_PROMPT + SYNC_PLANNER_PROMPT + PROMPT_SUFFIX)
        PlanSync->>ProviderFactory: createProvider(config)
        ProviderFactory->>OpenAIProvider: new OpenAICompatibleProvider(...)
        PlanSync->>Retry: chatWithRetry(provider, request)
        loop Retry up to 3 attempts
            Retry->>OpenAIProvider: chat(request)
            OpenAIProvider-->>Retry: ChatResponse
        end
        Retry-->>PlanSync: SyncPlan {regenerate: DocDefinition[], add: DocDefinition[]}
        PlanSync-->>SyncCmd: SyncPlan
        loop For each doc in regenerate + add
            SyncCmd->>RefreshDoc: refreshDoc(doc, context, existingDoc, changes, provider, model)
            RefreshDoc->>RefreshDoc: If no H2 sections -> fullUpdate (LLM rewrite)
            alt Has H2 sections
                RefreshDoc->>RefreshDoc: Build section patch prompt
                RefreshDoc->>Retry: chatWithRetry(provider, patchPrompt)
                Retry->>OpenAIProvider: chat(request)
                OpenAIProvider-->>Retry: ChatResponse
                Retry-->>RefreshDoc: SectionPatch[]
                RefreshDoc->>ApplyPatch: applySectionPatch(existingDoc, patches)
                ApplyPatch-->>RefreshDoc: Updated Markdown
            end
            RefreshDoc-->>SyncCmd: Updated Markdown
            SyncCmd->>SyncCmd: Write .aether/docs/{doc.outputPath}
        end
        SyncCmd->>WriteSnap: writeSnapshot(rootDir, meta, context, docs)
        WriteSnap->>WriteSnap: Write .aether/settings/context.json
        WriteSnap-->>SyncCmd: void
        SyncCmd-->>User: Sync complete
    end
```

### 3.4 LLM Provider Call Flow

```mermaid
sequenceDiagram
    participant Caller as Genesis/Sync Module
    participant Factory as src/providers/factory.ts:createProvider()
    participant Provider as src/providers/openai-compatible.ts:OpenAICompatibleProvider
    participant Retry as src/providers/retry.ts:chatWithRetry()
    participant HTTP as Native fetch API

    Caller->>Factory: createProvider(AetherConfig)
    Factory->>Provider: new OpenAICompatibleProvider(baseUrl, apiKey, timeout, name)
    Provider-->>Factory: LLMProvider instance
    Factory-->>Caller: LLMProvider

    Caller->>Retry: chatWithRetry(provider, ChatRequest, options)
    Retry->>Retry: Set options (maxRetries=3, baseDelay=2000)
    loop Attempt 1 to maxRetries
        Retry->>Provider: chat(ChatRequest)
        Provider->>Provider: streamRaw(request)
        Provider->>HTTP: POST {baseUrl}/chat/completions
        HTTP-->>Provider: Response (stream)
        Provider->>Provider: Parse SSE chunks
        Provider-->>Retry: ChatResponse (aggregated)
        alt Success
            Retry-->>Caller: ChatResponse
        else Error
            alt Rate limit (429 or "rate limit")
                Retry->>Retry: Upgrade to RATE_LIMIT_OPTIONS (6 retries, 15s base)
                Retry->>Retry: Extract retry-after from error
                Retry->>Retry: sleep(delay)
            else Other error
                Retry->>Retry: sleep(baseDelay * 2^attempt)
            end
            Retry->>options.onRetry: callback(attempt, maxRetries, error)
        end
    end
    Retry-->>Caller: Throw last error (if all retries exhausted)
```

---

## Notes

- **Genesis & Sync commands** are defined in the genesis modules (`src/genesis/*.ts`) but **not yet registered** in `src/commands/builtins.ts` or `src/commands/registry.ts` — the CLI only registers `help`, `config`, and `clean` commands currently.
- **Provider support**: Only `OpenAICompatibleProvider` exists; the Anthropic case in `factory.ts` has a TODO comment noting it needs its own provider implementation.
- **UI/REPL**: The `startChat()` REPL in `src/ui/prompt.ts` handles `/` commands via the registry but has no AI connection yet — `respond()` only does keyword matching.
- **Constants** in `src/genesis/constants.ts` are all configurable via `AETHER_*` environment variables via `envInt()`.
- **Config storage**: Global config at `~/.aether/config.json` holds shared `default` + per-project entries; secrets never written to repo.