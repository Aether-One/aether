import chalk from "chalk";
import type { LLMProvider, ChatRequest, ChatResponse } from "../providers/types.js";

const DIM = chalk.dim;
const WARN = chalk.yellow;

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // ms
  onRetry?: (attempt: number, maxRetries: number, error: string) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 2000,
};

/**
 * Wraps a provider.chat() call with retry logic and visual feedback.
 */
export async function chatWithRetry(
  provider: LLMProvider,
  request: ChatRequest,
  options?: Partial<RetryOptions>,
): Promise<ChatResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await provider.chat(request);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt > opts.maxRetries) {
        break;
      }

      // Notify about retry
      if (opts.onRetry) {
        opts.onRetry(attempt, opts.maxRetries, lastError.message);
      }

      // Exponential backoff
      const delay = opts.baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Formats a single retry notice line (no trailing newline) so it can be routed
 * either straight to stdout or through a spinner's `log()`.
 */
export function formatRetryLine(attempt: number, maxRetries: number, error: string): string {
  const sanitized = error.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  const shortError = sanitized.length > 80 ? sanitized.slice(0, 80) + "..." : sanitized;
  return `       ${WARN("↻")} Retry ${attempt}/${maxRetries} ${DIM(`— ${shortError}`)}`;
}

/**
 * Default retry logger that writes to stdout.
 */
export function createRetryLogger(): RetryOptions["onRetry"] {
  return (attempt, maxRetries, error) => {
    process.stdout.write(`${formatRetryLine(attempt, maxRetries, error)}\n`);
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
