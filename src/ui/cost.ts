import type { CostEstimate } from "../genesis/estimate.js";

import { ACCENT, DIM, SUCCESS } from "./theme.js";

function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatUSD(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatEstimate(
  meta: { provider: string; model: string },
  estimate: CostEstimate,
  docLabel: string,
): string {
  const lines: string[] = [];
  lines.push(`     ${ACCENT("Cost estimate")} ${DIM(`— ${meta.provider} · ${meta.model}`)}`);
  lines.push(`       ${DIM("Calls  ")} ~${estimate.calls} ${DIM(`(${docLabel})`)}`);
  lines.push(`       ${DIM("Input  ")} ~${num(estimate.inputTokens)} tokens ${DIM("(measured)")}`);
  lines.push(
    `       ${DIM("Output ")} ~${num(estimate.outputLow)}–${num(estimate.outputHigh)} tokens ${DIM("(estimated)")}`,
  );

  if (!estimate.pricing) {
    lines.push(`       ${DIM("Cost   ")} ${DIM("price unavailable for this model — showing tokens only")}`);
  } else if (estimate.pricing.free) {
    lines.push(`       ${DIM("Cost   ")} ${SUCCESS("Free")} ${DIM("($0.00)")}`);
  } else {
    const src = estimate.pricing.source === "static" ? " (approx.)" : "";
    lines.push(
      `       ${DIM("Cost   ")} ~${formatUSD(estimate.costLow ?? 0)}–${formatUSD(estimate.costHigh ?? 0)}${DIM(src)}`,
    );
  }
  return lines.join("\n") + "\n";
}
