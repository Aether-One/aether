# System Diagrams — aether

Diagrams below use only modules/files verifiable in the provided project context (`src/cli/index.ts`, `src/commands/*`, `src/config/index.ts`, `src/genesis/*`, `src/providers/*`, `src/prompts/*`, `src/ui/*`).

## Component Diagram

```mermaid
graph TD
  cli["src/cli/index.ts"]
  commands["src/commands/registry.ts, builtins.ts, config.ts, help.ts"]
  config["src/config/index.ts"]
  genesis["src/genesis/context.ts, planner.ts, docs.ts"]
  providers["src/providers/factory.ts, openai-compatible.ts, retry.ts, types.ts"]
  prompts["src/prompts/index.ts + individual prompt files"]
  ui["src/ui/animation.ts, prompt.ts, steps.ts"]

  cli --> commands
  cli --> ui
  commands --> config
  commands --> genesis
  commands --> providers
  genesis --> prompts
  genesis --> providers
  providers --> prompts
  ui --> commands
```

## Data Flow Diagram

```mermaid
flowchart LR
  user["User input (stdin)"] --> prompt["src/ui/prompt.ts"]
  prompt --> registry["src/commands/registry.ts"]
  registry --> builtins["/genesis handler in src/commands/builtins.ts"]
  builtins --> config["loadConfig (src/config/index.ts)"]
  builtins --> provider["createProvider (src/providers/factory.ts)"]
  builtins --> scan["scanContext (src/genesis/context.ts)"]
  scan --> buildprompt["buildPrompt (src/genesis/context.ts)"]
  buildprompt --> planner["planDocs (src/genesis/planner.ts)"]
  planner --> providerCall["chatWithRetry (src/providers/retry.ts)"]
  providerCall --> openai["OpenAICompatibleProvider (src/providers/openai-compatible.ts)"]
  planner --> docs["DOC_DEFINITIONS / buildCustomDocDefinition (src/genesis/docs.ts)"]
  docs --> writeFile["writeFile to .aether/docs/"]
```

## Sequence Diagram — `/genesis` flow

```mermaid
sequenceDiagram
  participant U as User
  participant P as src/ui/prompt.ts
  participant R as src/commands/registry.ts
  participant B as /genesis (src/commands/builtins.ts)
  participant C as src/config/index.ts
  participant F as src/providers/factory.ts
  participant O as src/providers/openai-compatible.ts
  participant G as src/genesis/context.ts
  participant PL as src/genesis/planner.ts
  participant D as src/genesis/docs.ts

  U->>P: /genesis [path]
  P->>R: registry.execute("/genesis ...")
  R->>B: handler(args)
  B->>C: loadConfig(process.cwd())
  C-->>B: AetherConfig | null
  B->>F: createProvider(config)
  F->>O: new OpenAICompatibleProvider(...)
  B->>O: ping()
  O-->>B: boolean
  B->>G: scanContext(targetDir)
  G-->>B: ProjectContext
  B->>G: buildPrompt(context)
  G-->>B: contextPrompt
  B->>PL: planDocs(contextPrompt, provider, model)
  PL->>O: chatWithRetry (PLANNER_PROMPT)
  O-->>PL: ChatResponse
  PL->>D: DOC_DEFINITIONS / buildCustomDocDefinition
  D-->>B: DocDefinition[]
  B->>O: chatWithRetry per doc (via src/providers/retry.ts)
  O-->>B: doc content
  B->>D: writeFile(.aether/docs/...)
  B->>D: buildDocsIndex(...)
```