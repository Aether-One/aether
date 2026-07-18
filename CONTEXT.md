# Aether — Project Context

> Documento para transferência de contexto entre sessões de AI.
> Última atualização: 2026-07-18

---

## O que é o Aether?

Aether é uma CLI open-source que transforma qualquer codebase em um workspace AI-native. Ele analisa repositórios e gera uma knowledge base completa (arquitetura, módulos, APIs, regras de negócio, diagramas) usando LLMs.

**Repositório:** `D:\GitHub\aether`
**Linguagem:** TypeScript (Node.js 20+, ESM)
**Dependências:** chalk (única dep de produção)
**Dev deps:** typescript, tsx, esbuild, postject, @types/node

---

## Status Atual

O projeto tem uma CLI interativa funcional com dois comandos principais implementados:

- `/config` — configura provider de AI (OpenAI, Anthropic, Gemini)
- `/genesis` — analisa um projeto com AI e gera documentação em `.aether/docs/`

### O que funciona:
- CLI com prompt interativo, animação de startup, sistema de comandos (registry pattern)
- Comandos case-insensitive (`/CONFIG`, `/Genesis` etc. funcionam)
- Configuração de provider (salva em `.aether/config.json`)
- Scanner de contexto (lê arquivos do projeto, monta prompt otimizado)
- Planner inteligente (AI decide quais docs gerar baseado no projeto)
- Geração sequencial de docs com step runner visual (spinner/writing/done)
- Retry com backoff exponencial e feedback visual (mensagem sanitizada, sem quebra de linha)
- Anti-alucinação em 3 camadas (base prompt, contexto explícito, suffix)
- Error handling robusto — erros não crasham o programa, mostram mensagem amigável e voltam ao prompt
- Help acessível via `/comando help` (sem precisar de `--`)

### Problemas conhecidos:
- **Modelos locais alucinam** — codestral (e provavelmente outros modelos pequenos) ignora o contexto e inventa tecnologias/arquiteturas. Modelos maiores (GPT-4o, Claude, Gemini) devem funcionar bem.
- **Gemini free tier instável** — rate limits agressivos, pode dar 429 mesmo com pouco uso. OpenRouter é alternativa mais confiável.

### Corrigido recentemente (2026-07-18):
- **Scanner cortava o contexto artificialmente** — `context.ts` tinha `MAX_SOURCE_FILES = 10` e `MAX_FILE_SIZE = 8_000`. Num projeto com >20 arquivos, isso deixava de fora `src/prompts/*.ts` inteiro, `builtins.ts` e o próprio `context.ts`. O modelo não alucinava — ele reportava "not provided in context" corretamente, mas os docs ficavam incompletos. Resolvido: sem cap fixo de arquivos, budget de char total (`MAX_TOTAL_CHARS`) bem mais generoso, e `MAX_FILE_SIZE` maior. Ver seção "Scanner de Contexto" abaixo.
- **`.aether/config.json` não estava no `.gitignore`** — a API key ficava em texto puro e aparecia como untracked no git. Adicionado ao `.gitignore`.
- **`provider` dessincronizava de `baseUrl`** — `/config set url`/`set model`/`set key` nunca tocavam no campo `provider`, então dava pra acabar com `provider: "gemini"` enquanto `baseUrl` apontava pra OpenRouter rodando outro modelo (ex: `tencent/hy3:free`). Era só cosmético (o campo não afeta headers/auth, ver `openai-compatible.ts`), mas confunde debug futuro. Resolvido: `openrouter` virou provider de primeira classe (`/config openrouter`, default model `openrouter/auto`), e `detectProviderFromBaseUrl()` em `src/config/index.ts` re-sincroniza `provider` automaticamente sempre que `baseUrl` muda pra um host conhecido.

---

## Arquitetura

```
src/
├── cli/
│   └── index.ts              → Entry point, registra comandos, inicia prompt
├── commands/
│   ├── registry.ts           → CommandRegistry (case-insensitive, register/get/execute)
│   ├── builtins.ts           → /genesis, /exit, /clear + formatError()
│   ├── config.ts             → /config (setup de provider)
│   └── help.ts               → /help (mostra usage inline de cada comando)
├── config/
│   └── index.ts              → AetherConfig type, load/save/validate config
├── providers/
│   ├── types.ts              → Interface LLMProvider (chat, chatStream, ping)
│   ├── openai-compatible.ts  → OpenAICompatibleProvider (funciona com OpenAI, Gemini, OpenRouter)
│   ├── factory.ts            → createProvider(config) → LLMProvider
│   ├── retry.ts              → chatWithRetry + createRetryLogger (sanitiza erros em 1 linha)
│   └── index.ts              → re-exports
├── genesis/
│   ├── context.ts            → scanContext() + buildPrompt() — lê o projeto INTEIRO (sem cap fixo de arquivos) e monta contexto
│   ├── planner.ts            → planDocs() — AI decide quais docs do catálogo gerar + pode propor docs customizados (path/title/focus)
│   └── docs.ts               → DOC_DEFINITIONS (catálogo fixo) + buildCustomDocDefinition() pra docs propostos pela AI
├── prompts/
│   ├── base.ts               → BASE_PROMPT (anti-alucinação, inclui regra vision-vs-código) + PROMPT_SUFFIX
│   ├── planner.ts            → PLANNER_PROMPT (schema misto: string | {path,title,focus})
│   ├── custom-doc.ts         → buildCustomDocPrompt(title, focus) — template genérico pra docs customizados
│   ├── system-overview.ts    → Prompt para system overview
│   ├── folder-structure.ts   → Prompt para folder structure
│   ├── tech-stack.ts         → Prompt para tech stack
│   ├── coding-standards.ts   → Prompt para coding standards
│   ├── modules.ts            → Prompt para modules overview
│   ├── api.ts                → Prompt para API/endpoints
│   ├── business.ts           → Prompt para business rules
│   ├── diagrams.ts           → Prompt para diagramas mermaid
│   ├── ai-context.ts         → Prompt para AI_CONTEXT.md
│   ├── glossary.ts           → Prompt para glossário
│   └── index.ts              → re-exports
└── ui/
    ├── animation.ts          → Banner e animação de startup
    ├── prompt.ts             → Prompt interativo (readline)
    └── steps.ts              → StepRunner (spinner animado, estados visual)
```

---

## Fluxo do `/genesis`

```
1. Valida path (existe? é diretório?)
2. Carrega .aether/config.json
3. Cria provider e faz ping (GET /models)
4. scanContext(targetDir) → lê configs, vision docs (CONTEXT.md/docs/*.md), entry points e TODOS os source files que caibam no budget (~300k chars, sem cap fixo de quantidade)
5. buildPrompt(context) → monta prompt com contexto completo do projeto; arquivos omitidos por tamanho são listados explicitamente (nunca descartados em silêncio)
6. planDocs(contextPrompt) → AI retorna um array misto: ids do catálogo fixo (DOC_DEFINITIONS) + até 5 docs customizados ({path, title, focus}) pra algo específico do projeto que não se encaixa no catálogo
   - system-overview, folder-structure, tech-stack e ai-context são SEMPRE gerados, independente da resposta da AI
   - Paths de docs customizados são sanitizados (sem `..`, sem path absoluto) antes de virar arquivo
   - Se falhar (429, timeout etc): erro propaga, mostra mensagem amigável, volta ao prompt
   - Se resposta não parseável: usa set mínimo (system-overview, folder-structure, tech-stack, ai-context)
7. showPlannerThought() → mostra no terminal o que decidiu (catálogo + customizados)
8. Para cada doc (sequencial):
   a. buildPrompt do doc (BASE_PROMPT + contexto + prompt específico + SUFFIX)
   b. chatWithRetry (3 tentativas, backoff exponencial)
   c. Escreve arquivo em .aether/docs/
   d. StepRunner atualiza visual (spinner → writing → done)
9. Escreve context.json
10. Mostra tempo total
```

---

## Output gerado pelo genesis

```
.aether/
├── config.json                          → Configuração do provider
├── context.json                         → Metadados da geração
└── docs/
    ├── architecture/
    │   ├── system-overview.md
    │   ├── folder-structure.md
    │   ├── tech-stack.md
    │   └── coding-standards.md
    ├── modules/overview.md
    ├── api/endpoints.md
    ├── business/rules.md
    ├── diagrams/system.md
    ├── AI_CONTEXT.md
    ├── glossary.md
    └── .../                                → docs customizados que a AI propôs pra esse projeto
```

Nota: nem todos os docs do catálogo são gerados sempre (exceto system-overview, folder-structure, tech-stack e ai-context, que são sempre gerados). O planner decide o resto, e pode adicionar docs customizados que não estão nessa lista fixa.

---

## Sistema de Config

```typescript
interface AetherConfig {
  provider: "openai" | "anthropic" | "gemini" | "openrouter";
  model: string;
  baseUrl: string;
  apiKey?: string;
}
```

Defaults:
- Gemini: `gemini-2.0-flash` em `https://generativelanguage.googleapis.com/v1beta/openai`
- OpenAI: `gpt-4o` em `https://api.openai.com/v1`
- Anthropic: `claude-sonnet-4-20250514` em `https://api.anthropic.com/v1`
- OpenRouter: `openrouter/auto` em `https://openrouter.ai/api/v1` (qualquer modelo free/pago, ex. `google/gemini-2.0-flash-exp:free` — sobrescreva com `/config set model`)

`detectProviderFromBaseUrl()` mantém `provider` sincronizado com a `baseUrl` real — se você faz `/config set url <host conhecido>`, o campo `provider` é corrigido automaticamente pra refletir o host, em vez de ficar com o label do setup anterior.

---

## Provider System

Interface unificada `LLMProvider`:
- `chat(request)` → resposta completa
- `chatStream(request)` → AsyncGenerator de chunks
- `ping()` → health check (GET /models)

Implementação única: `OpenAICompatibleProvider` (funciona com qualquer API OpenAI-compatible):
- OpenAI (cloud)
- Gemini (via endpoint OpenAI-compatible do Google)
- OpenRouter (proxy com vários modelos) — provider de primeira classe desde 2026-07-18
- Qualquer outro proxy compatível (`baseUrl` custom; `provider` fica com o último valor definido, sem auto-detecção pra hosts desconhecidos)

O provider Anthropic precisaria de implementação separada (API diferente), mas funciona via OpenRouter.

**Nota:** o parâmetro `name` passado pro `OpenAICompatibleProvider` é só um label (`this.name`) — não muda headers, auth ou comportamento. Toda request usa `Authorization: Bearer <apiKey>`, independente do provider configurado.

**Não há fallback entre modelos.** Se o modelo configurado falhar, o erro propaga e o usuário vê a mensagem.

---

## Error Handling

O genesis tem um try/catch global que formata erros amigáveis:
- **429 (rate limit)** → mostra tempo de espera sugerido
- **401/403 (auth)** → sugere checar API key
- **Timeout** → informa que modelo demorou demais
- **Conexão** → sugere checar internet/URL
- **Genérico** → primeira linha truncada em 120 chars

Nenhum erro crasha o programa. Sempre volta ao prompt interativo.

---

## Anti-alucinação (3 camadas)

1. **Contexto explícito** (context.ts): Diz "THIS IS THE COMPLETE PROJECT. If something is NOT listed here, it DOES NOT EXIST." Arquivos omitidos por tamanho/budget são listados explicitamente (nunca some em silêncio).
2. **BASE_PROMPT** (início): Regras agressivas — nunca inventar, nunca adivinhar tecnologias, só referenciar o que vê. Inclui regra específica sobre vision docs (CONTEXT.md etc.): descrevem intenção/roadmap, não prova de que algo está implementado.
3. **PROMPT_SUFFIX** (fim): Sandwich technique — reforça no final "Only reference what is EXPLICITLY visible"

**Nota:** Modelos locais pequenos (codestral, llama3:8b) ignoram essas instruções. Funciona bem com GPT-4o, Claude, Gemini. Testado também com `tencent/hy3:free` via OpenRouter — mesmo sendo um modelo free/pequeno, respeitou as regras (nunca inventou, disse "not provided in context" quando faltava informação). O problema que existia não era o modelo alucinando, era o scanner cortando arquivos do contexto (ver "Corrigido recentemente" acima).

---

## Retry System

- Até 3 tentativas com backoff exponencial (2s → 4s → 8s)
- Mostra no terminal: `↻ Retry 1/3 — <erro resumido>`
- Mensagem sanitizada (newlines removidos, truncada em 80 chars)
- Timeout de 5 minutos por request

---

## UI / Step Runner

O `StepRunner` renderiza in-place no terminal usando ANSI escape codes:
- `○` pending (dim)
- `⠹` running (spinner animado 80ms)
- `✎` writing (amarelo)
- `✓` done (verde)
- `✗` error (vermelho)

Sobrescreve as linhas anteriores pra dar efeito de "app" no terminal.

---

## Sistema de Help

- `/help` — lista todos os comandos com usage inline + dica de usar `/comando help`
- `/comando help` — mostra help detalhado do comando (aceita também `--help` e `-h`)
- `/config help` — mostra providers disponíveis com modelo default, pricing e link pra key
- Comandos são case-insensitive (`/CONFIG`, `/Genesis` etc.)

---

## Decisões de Design

1. **Prompts em arquivos separados** (`src/prompts/`) — prompts são conteúdo, não código. Facilita iterar sem mexer na lógica.
2. **Planner antes de gerar** — não gera docs desnecessários (ex: business rules pra um projeto sem lógica de negócio).
3. **Sem streaming visível** — o output do LLM não aparece no terminal. Apenas loading → done.
4. **Sequencial, não paralelo** — gera um doc por vez pra não sobrecarregar a API.
5. **Provider-agnostic** — interface unificada OpenAI-compatible, trocar de provider é só mudar o config.
6. **Sem fallback** — se falhou, falhou. Usuário decide o que fazer.
7. **Sem Ollama** — removido por problemas de alucinação com modelos locais pequenos. Foco em APIs cloud.
8. **Nunca crashar** — erros são capturados e formatados, programa nunca termina por exceção.

---

## Roadmap / Próximos Passos

- [ ] Testar geração completa com Gemini/OpenAI (aguardando API key funcional)
- [ ] Provider dedicado pra Anthropic (API diferente da OpenAI)
- [ ] `/sync` — manter docs atualizados quando código muda, sem regenerar tudo. Comando já registrado (`src/commands/builtins.ts`) como stub — só avisa "em desenvolvimento" e aponta pra `/genesis --force`. Lógica real (diff incremental) ainda não existe. `/genesis` detecta `.aether/docs/` existente e recomenda `/sync` em vez de regenerar.
- [ ] `aether explain <topic>` — consultar a knowledge base
- [ ] Suporte a `npx aether genesis` (sem CLI interativa, modo direto)
- [ ] MCP Server — expor knowledge base pra outros AI tools

---

## Como Rodar

```bash
# Dev mode
npx tsx src/cli/index.ts

# Build
npm run build

# Fluxo de teste
# 1. Rodar a CLI: npx tsx src/cli/index.ts
# 2. /config gemini (ou openai)
# 3. /config set key <sua-api-key>
# 4. /genesis
```

Alternativa com OpenRouter (free, confiável):
```bash
# 1. Criar key em https://openrouter.ai/keys
# 2. Na CLI:
#    /config set url https://openrouter.ai/api/v1
#    /config set model google/gemini-2.0-flash-exp:free
#    /config set key <openrouter-key>
# 3. /genesis
```

---

## Padrões do Código

- ESM (type: "module" no package.json)
- TypeScript strict
- NodeNext module resolution
- Imports com `.js` extension (obrigatório pra ESM)
- Chalk pra cores no terminal
- Sem frameworks pesados — tudo nativo do Node (readline, fs, path)
- Classes só onde faz sentido (CommandRegistry, OpenAICompatibleProvider, StepRunner)
- Funções pra o resto
- Nenhum `any` (exceto 1 cast forçado no config set)
