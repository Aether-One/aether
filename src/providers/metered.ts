import type { LLMProvider, ChatRequest, ChatResponse, StreamChunk, PingResult } from "./types.js";
import { estimateTokens } from "../util/tokens.js";

export interface UsageTotals {
  promptTokens: number;
  completionTokens: number;
  calls: number;
  estimated: boolean;
}

// Wraps a provider to inject a shared cancel signal into every call — genesis/sync
// route all model calls through chat(), so wrapping once covers the whole run.
export class MeteredProvider implements LLMProvider {
  readonly usage: UsageTotals = { promptTokens: 0, completionTokens: 0, calls: 0, estimated: false };
  private signal?: AbortSignal;

  constructor(private inner: LLMProvider) {}

  get name(): string {
    return this.inner.name;
  }

  setSignal(signal: AbortSignal | undefined): void {
    this.signal = signal;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const merged = this.signal && !request.signal ? { ...request, signal: this.signal } : request;

    let response: ChatResponse;
    try {
      response = await this.inner.chat(merged);
    } catch (err) {
      // The injected signal isn't on chatWithRetry's `request`, so flag the cancel here.
      if (this.signal?.aborted && err && typeof err === "object") {
        (err as { cancelled?: boolean }).cancelled = true;
      }
      throw err;
    }

    this.usage.calls++;
    if (response.usage) {
      this.usage.promptTokens += response.usage.promptTokens ?? 0;
      this.usage.completionTokens += response.usage.completionTokens ?? 0;
    } else {
      const promptText = request.messages.map((m) => m.content).join("\n");
      this.usage.promptTokens += estimateTokens(promptText);
      this.usage.completionTokens += estimateTokens(response.content);
      this.usage.estimated = true;
    }
    return response;
  }

  chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const merged = this.signal && !request.signal ? { ...request, signal: this.signal } : request;
    return this.inner.chatStream(merged);
  }

  ping(): Promise<PingResult> {
    return this.inner.ping();
  }
}
