# System Diagrams

The following diagrams are derived strictly from the files and relationships present in the provided project context (aether v0.1.3).

## 1. Component Diagram

Shows the main modules/packages and their import relationships as verified in the distilled source facts.

```mermaid
graph TD
    CLI["src/cli/index.ts"]
    UI_PROMPT["src/ui/prompt.ts"]
    UI_ANIM["src/ui/animation.ts"]
    CMD_HELP["src/commands/help.ts"]
    CMD_BUILT["src/commands/builtins.ts"]
    CMD_CONFIG["src/commands/config.ts"]
    CMD_REG["src/commands/registry.ts"]
    CFG["src/config/index.ts"]
    SCAFFOLD["src/config/scaffold.ts"]
    PROV_IDX["src/providers/index.ts"]
    PROV_FACT["src/providers/factory.ts"]
    PROV_OAI["src/providers/openai-compatible.ts"]
    PROV_TYPES["src/providers/types.ts"]
    PROV_RETRY["src/providers/retry.ts"]
    GEN_CTX["src/genesis/context.ts"]
    GEN_DIG["src/genesis/digest.ts"]
    GEN_PLAN["src/genesis/planner.ts"]
    GEN_SCOPE["src/genesis/scope.ts"]
    GEN_DOCS["src/genesis/docs.ts"]
    GEN_FP["src/genesis/fingerprint.ts"]
    GEN_SYNC["src/genesis/sync.ts"]
    GEN_DIGEST["src/genesis/digest.ts"]
    PROMPTS["src/prompts/index.ts"]

    CLI --> UI_PROMPT
    CLI --> UI_ANIM
    CLI --> CMD_HELP
    CLI --> CMD_BUILT
    CLI --> CMD_CONFIG
    CMD_HELP --> CMD_REG
    CMD_CONFIG --> CMD_REG
    CMD_CONFIG --> CFG
    CMD_BUILT --> CMD_REG
    CMD_BUILT --> CFG
    CMD_BUILT --> PROV_FACT
    CMD_BUILT --> PROV_RETRY
    CMD_BUILT --> GEN_CTX
    CMD_BUILT --> GEN_DIGEST
    CMD_BUILT --> GEN_PLAN
    CMD_BUILT --> GEN_SCOPE
    CMD_BUILT --> GEN_DOCS
    CMD_BUILT --> GEN_FP
    CMD_BUILT --> GEN_SYNC
    CFG --> SCAFFOLD
    PROV_FACT --> PROV_OAI
    PROV_FACT --> PROV_TYPES
    PROV_IDX --> PROV_OAI
    PROV_IDX --> PROV_FACT
    PROV_IDX --> PROV_TYPES
    PROV_RETRY --> PROV_TYPES
    GEN_SCOPE --> GEN_CTX
    GEN_SCOPE --> PROV_TYPES
    GEN_SCOPE --> GEN_DIG
    GEN_DIG --> PROV_TYPES
    GEN_DIG --> PROV_RETRY
    GEN_PLAN --> PROV_TYPES
    GEN_PLAN --> PROV_RETRY
    GEN_PLAN --> GEN_DOCS
    GEN_PLAN --> PROMPTS
    GEN_DOCS --> PROMPTS
```

## 2. Data Flow Diagram

Illustrates the flow of project data during the `/genesis` command as implemented in `src/commands/builtins.ts` and supporting genesis modules.

```mermaid
flowchart LR
    FS[(Filesystem: repo files)]
    CTX["scanContext (genesis/context.ts)"]
    PROJ["ProjectContext"]
    DIG["buildPlannerDigest (genesis/digest.ts)"]
    PLAN["planDocs (genesis/planner.ts)"]
    PROV["OpenAICompatibleProvider (providers/openai-compatible.ts)"]
    SCOPE["buildSharedProjectContext (genesis/scope.ts)"]
    DIST["distillFiles (genesis/distill.ts)"]
    DOCS["DOC_DEFINITIONS / buildDocsIndex (genesis/docs.ts)"]
    OUT[(".aether/docs/*.md")]

    FS --> CTX
    CTX --> PROJ
    PROJ --> DIG
    DIG --> PLAN
    PLAN --> PROV
    PROV --> PLAN
    PLAN --> SCOPE
    SCOPE --> DIST
    DIST --> PROV
    PROV --> DIST
    SCOPE --> DOCS
    DOCS --> OUT
```

## 3. Sequence Diagram

Key flow: user invokes `/genesis` from the CLI chat, triggering analysis and documentation generation.

```mermaid
sequenceDiagram
    participant User
    participant CLI as cli/index.ts
    participant Chat as ui/prompt.ts (startChat)
    participant Reg as commands/registry.ts
    participant Built as commands/builtins.ts
    participant Cfg as config/index.ts
    participant Prov as providers/factory.ts
    participant Ctx as genesis/context.ts
    participant Plan as genesis/planner.ts
    participant Scope as genesis/scope.ts
    participant Docs as genesis/docs.ts
    participant FS as Filesystem

    User->>CLI: run aether (node)
    CLI->>Chat: startChat()
    User->>Chat: type /genesis
    Chat->>Reg: execute("/genesis")
    Reg->>Built: handler(args)
    Built->>Cfg: loadConfig(process.cwd())
    Cfg-->>Built: AetherConfig | null
    Built->>Prov: createProvider(config)
    Prov-->>Built: LLMProvider
    Built->>Ctx: scanContext(targetDir)
    Ctx->>FS: read config/vision/source files
    Ctx-->>Built: ProjectContext
    Built->>Plan: planDocs(contextPrompt, provider, model)
    Plan->>Prov: chatWithRetry(...)
    Prov-->>Plan: ChatResponse (doc plan)
    Plan-->>Built: DocDefinition[]
    Built->>Scope: buildSharedProjectContext(context, provider, model)
    Scope-->>Built: prompt string
    Built->>Docs: buildDocsIndex(...)
    Docs-->>Built: index markdown
    Built->>FS: write .aether/docs/*.md + README.md
    FS-->>User: generated knowledge base
```