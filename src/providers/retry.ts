import type { LLMProvider, ChatRequest, ChatResponse } from "../providers/types.js";

import { DIM, WARN } from "../ui/theme.js";

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // ms
  onRetry?: (attempt: number, maxRetries: number, error: string) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 2000,
};

/** Extra retries and longer delays for rate-limit errors. */
const RATE_LIMIT_OPTIONS: RetryOptions = {
  maxRetries: 6,
  baseDelay: 15000, // 15s base, doubles each time (15, 30, 60, 120...)
};

function isRateLimitError(error: string): boolean {
  return error.includes("429") || error.toLowerCase().includes("rate limit");
}

/**
 * Extracts a retry delay hint from the error message if present.
 * Providers often include something like "retry in 42s" or "retry after 30 seconds".
 */
function extractRetryDelay(error: string): number | null {
  const match = error.match(/retry[\s_-]*(?:in|after)\s*([\d.]+)\s*s/i);
  if (match) {
    const seconds = Math.ceil(Number(match[1]));
    if (seconds > 0 && seconds < 600) return seconds * 1000;
  }
  return null;
}

/**
 * Wraps a provider.chat() call with retry logic and visual feedback.
 * Rate-limit errors (429) get extra retries with longer backoff.
 */
export async function chatWithRetry(
  provider: LLMProvider,
  request: ChatRequest,
  options?: Partial<RetryOptions>,
): Promise<ChatResponse> {
  const baseOpts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let attempt = 0;
  let maxRetries = baseOpts.maxRetries;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      return await provider.chat(request);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errorMsg = lastError.message;

      // On first rate-limit hit, upgrade to longer retry strategy
      if (isRateLimitError(errorMsg) && maxRetries === baseOpts.maxRetries) {
        maxRetries = RATE_LIMIT_OPTIONS.maxRetries;
      }

      if (attempt > maxRetries) break;

      // Notify about retry
      const onRetry = baseOpts.onRetry;
      if (onRetry) {
        onRetry(attempt, maxRetries, errorMsg);
      }

      // Calculate delay
      let delay: number;
      if (isRateLimitError(errorMsg)) {
        // Use provider-suggested delay if available, otherwise exponential from 15s
        const suggested = extractRetryDelay(errorMsg);
        const exponential = RATE_LIMIT_OPTIONS.baseDelay * Math.pow(2, attempt - 1);
        delay = suggested ? Math.max(suggested, RATE_LIMIT_OPTIONS.baseDelay) : exponential;
      } else {
        delay = baseOpts.baseDelay * Math.pow(2, attempt - 1);
      }

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

  // Add wait hint for rate limits
  let suffix = "";
  if (isRateLimitError(sanitized)) {
    const suggested = extractRetryDelay(sanitized);
    suffix = suggested
      ? ` ${DIM(`(waiting ${Math.round(suggested / 1000)}s)`)}`
      : ` ${DIM("(waiting for rate limit)")}`;
  }

  return `       ${WARN("↻")} Retry ${attempt}/${maxRetries}${suffix} ${DIM(`— ${shortError}`)}`;
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
