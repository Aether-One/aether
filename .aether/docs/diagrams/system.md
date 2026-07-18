# System Diagrams

The following diagrams are derived strictly from the files and modules present in the provided `aether` project context.

## Component Diagram

```mermaid
graph TD
    cli["src/cli/index.ts"]
    ui["src/ui/animation.ts<br/>src/ui/prompt.ts<br/>src/ui/steps.ts"]
    commands["src/commands/registry.ts<br/>src/commands/help.ts<br/>src/commands/builtins.ts<br/>src/commands/config.ts"]
    config["src/config/index.ts"]
    genesis["src/genesis/context.ts<br/>src/genesis/docs.ts<br/>src/genesis/planner.ts"]
    prompts["src/prompts/index.ts + prompt modules"]
    providers["src/providers/factory.ts<br/>src/providers/openai-compatible.ts<br/>src/providers/retry.ts<br/>src/providers/types.ts"]

    cli --> ui
    cli --> commands
    commands --> config
    commands --> genesis
    commands --> providers
    genesis --> prompts
    genesis --> providers
    providers --> config
```

## Data Flow Diagram

```mermaid
flowchart LR
    user["User (stdin)"] --> prompt["src/ui/prompt.ts"]
    prompt --> registry["src/commands/registry.ts"]
    registry --> builtins["src/commands/builtins.ts"]
    builtins --> context["src/genesis/context.ts"]
    context --> buildPrompt["buildPrompt()"]
    buildPrompt --> planner["src/genesis/planner.ts"]
    planner --> providers["src/providers/openai-compatible.ts"]
    providers --> docs["src/genesis/docs.ts"]
    docs --> fs[".aether/docs/ + context.json"]
```

## Sequence Diagram — `/genesis` command flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as src/ui/prompt.ts
    participant R as src/commands/registry.ts
    participant B as src/commands/builtins.ts
    participant C as src/config/index.ts
    participant PR as src/providers/factory.ts
    participant O as src/providers/openai-compatible.ts
    participant G as src/genesis/context.ts
    participant PL as src/genesis/planner.ts
    participant D as src/genesis/docs.ts
    participant S as src/ui/steps.ts

    U->>P: type /genesis
    P->>R: registry.execute("/genesis")
    R->>B: handler(args)
    B->>C: loadConfig(process.cwd())
    C-->>B: AetherConfig | null
    B->>PR: createProvider(config)
    PR->>O: new OpenAICompatibleProvider(...)
    B->>O: provider.ping()
    O-->>B: boolean
    B->>G: scanContext(targetDir)
    G-->>B: ProjectContext
    B->>G: buildPrompt(context)
    G-->>B: contextPrompt
    B->>PL: planDocs(contextPrompt, provider, model)
    PL->>O: chatWithRetry(provider, ...)
    O-->>PL: ChatResponse
    PL-->>B: DocDefinition[]
    B->>S: new StepRunner("generating docs")
    loop for each DocDefinition
        B->>O: chatWithRetry(provider, ...)
        O-->>B: ChatResponse
        B->>D: doc.buildPrompt(contextPrompt)
        B->>fs: writeFile(outputPath)
    end
    B->>fs: writeFile(context.json)
    B->>S: runner.finish(...)
```