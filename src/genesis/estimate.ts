import type { ProjectContext } from "./types.js";
import { buildPrompt } from "./context.js";
import { DOC_CONTEXT_BUDGET } from "./constants.js";
import type { ModelPricing } from "../pricing/index.js";

const tokensFromChars = (chars: number): number => Math.ceil(chars / 4);

// Output multipliers relative to a doc's size. Reasoning is disabled on our providers,
// so output tracks doc size closely — a tight band (patch → full rewrite), no 2× blowup.
const REFRESH_OUT_LOW = 0.7;
const REFRESH_OUT_HIGH = 1.3;
const NEW_DOC_OUT_LOW = 0.8;
const NEW_DOC_OUT_HIGH = 1.3;
const GENESIS_OUT_LOW = 0.8;
const GENESIS_OUT_HIGH = 1.3;
const DISTILL_OUTPUT_PER_CHUNK = 800;
const PROMPT_OVERHEAD_CHARS = 3500;
const GENESIS_DOC_CONTEXT_RATIO = 0.18;
const GENESIS_DOC_CHARS_MIN = 10_000;
const GENESIS_DOC_CHARS_MAX = 30_000;
const DEFAULT_DOC_CHARS = 12_000;

export interface CostEstimate {
  calls: number;
  inputTokens: number;
  outputLow: number;
  outputHigh: number;
  costLow: number | null;
  costHigh: number | null;
  pricing: ModelPricing | null;
}

interface Job {
  inputChars: number;
  outputLow: number;
  outputHigh: number;
}

interface DistillPlan {
  calls: number;
  inputChars: number;
  output: number;
}

function sharedContextChars(context: ProjectContext): number {
  const full = buildPrompt(context).length;
  if (full <= DOC_CONTEXT_BUDGET) return full;
  const orientation = buildPrompt({ ...context, entryPoints: [], sourceFiles: [] }).length;
  return orientation + DOC_CONTEXT_BUDGET;
}

function distillPlan(context: ProjectContext): DistillPlan | null {
  const full = buildPrompt(context).length;
  if (full <= DOC_CONTEXT_BUDGET) return null;

  const sourceChars = [...context.entryPoints, ...context.sourceFiles].reduce((s, f) => s + f.content.length, 0);
  const chunkBudget = Math.max(4_000, Math.floor(DOC_CONTEXT_BUDGET * 0.75));
  const calls = Math.max(1, Math.ceil(sourceChars / chunkBudget));
  return { calls, inputChars: sourceChars, output: calls * DISTILL_OUTPUT_PER_CHUNK };
}

function assemble(jobs: Job[], distill: DistillPlan | null, pricing: ModelPricing | null): CostEstimate {
  let inputTokens = jobs.reduce((s, j) => s + tokensFromChars(j.inputChars), 0);
  let outputLow = jobs.reduce((s, j) => s + j.outputLow, 0);
  let outputHigh = jobs.reduce((s, j) => s + j.outputHigh, 0);
  let calls = jobs.length;

  if (distill) {
    inputTokens += tokensFromChars(distill.inputChars);
    outputLow += distill.output;
    outputHigh += distill.output;
    calls += distill.calls;
  }

  const costLow = pricing ? inputTokens * pricing.inputPerToken + outputLow * pricing.outputPerToken : null;
  const costHigh = pricing ? inputTokens * pricing.inputPerToken + outputHigh * pricing.outputPerToken : null;

  return { calls, inputTokens, outputLow, outputHigh, costLow, costHigh, pricing };
}

export function estimateGenesis(context: ProjectContext, docCount: number, pricing: ModelPricing | null): CostEstimate {
  const shared = sharedContextChars(context);
  const perDocChars = shared + PROMPT_OVERHEAD_CHARS;
  // No existing docs to measure — size output from the context each doc distills.
  const outChars = clamp(shared * GENESIS_DOC_CONTEXT_RATIO, GENESIS_DOC_CHARS_MIN, GENESIS_DOC_CHARS_MAX);
  const outTokens = tokensFromChars(outChars);
  const jobs: Job[] = Array.from({ length: docCount }, () => ({
    inputChars: perDocChars,
    outputLow: Math.round(outTokens * GENESIS_OUT_LOW),
    outputHigh: Math.round(outTokens * GENESIS_OUT_HIGH),
  }));
  return assemble(jobs, distillPlan(context), pricing);
}

// refreshDocChars: real byte size of each doc being refreshed (0/missing → default).
export function estimateSync(
  context: ProjectContext,
  refreshDocChars: number[],
  addCount: number,
  pricing: ModelPricing | null,
): CostEstimate {
  const ctx = sharedContextChars(context) + PROMPT_OVERHEAD_CHARS;
  const measured = refreshDocChars.filter((c) => c > 0);
  const avgDoc = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : DEFAULT_DOC_CHARS;

  const jobs: Job[] = [];
  for (const raw of refreshDocChars) {
    const docChars = raw > 0 ? raw : DEFAULT_DOC_CHARS;
    const outTokens = tokensFromChars(docChars);
    jobs.push({
      inputChars: ctx + docChars,
      outputLow: Math.round(outTokens * REFRESH_OUT_LOW),
      outputHigh: Math.round(outTokens * REFRESH_OUT_HIGH),
    });
  }
  for (let i = 0; i < addCount; i++) {
    const outTokens = tokensFromChars(avgDoc);
    jobs.push({
      inputChars: ctx,
      outputLow: Math.round(outTokens * NEW_DOC_OUT_LOW),
      outputHigh: Math.round(outTokens * NEW_DOC_OUT_HIGH),
    });
  }
  return assemble(jobs, distillPlan(context), pricing);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
