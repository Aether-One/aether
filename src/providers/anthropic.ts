import type { LLMProvider, ChatRequest, ChatResponse, StreamChunk, PingResult } from "./types.js";

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 8192; // Anthropic requires max_tokens.

// Native Messages API — Anthropic isn't OpenAI-compatible (own endpoint, auth, SSE shape).
export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private baseUrl: string;
  private apiKey: string;
  private idleTimeout: number;

  constructor(baseUrl: string, apiKey?: string, idleTimeout?: number) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey || "";
    this.idleTimeout = idleTimeout || 120_000;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    let content = "";
    let model = request.model;
    let usage: ChatResponse["usage"];

    for await (const chunk of this.streamRaw(request)) {
      content += chunk.delta;
      if (chunk.model) model = chunk.model;
      if (chunk.usage) usage = chunk.usage;
    }

    return { content, model, usage };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    for await (const chunk of this.streamRaw(request)) {
      if (chunk.delta) yield { content: chunk.delta, done: false };
    }
    yield { content: "", done: true };
  }

  private async *streamRaw(
    request: ChatRequest,
  ): AsyncGenerator<{ delta: string; model?: string; usage?: ChatResponse["usage"] }> {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    if (request.signal) {
      if (request.signal.aborted) controller.abort();
      else request.signal.addEventListener("abort", onExternalAbort, { once: true });
    }
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => controller.abort(), this.idleTimeout);
    };
    armIdle();

    // Anthropic takes `system` as a top-level string, not a message role.
    const system = request.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    // Usage arrives in pieces: input_tokens in message_start, output_tokens in message_delta.
    let inputTokens = 0;
    let outputTokens = 0;
    let model = request.model;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: request.temperature ?? 0.7,
          ...(system ? { system } : {}),
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error (${response.status}): ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdle();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          // Anthropic sends `event:` lines and `data:` lines; we only need the data JSON.
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data) as AnthropicStreamEvent;
            switch (parsed.type) {
              case "message_start":
                if (parsed.message?.model) model = parsed.message.model;
                if (parsed.message?.usage?.input_tokens) inputTokens = parsed.message.usage.input_tokens;
                break;
              case "content_block_delta":
                if (parsed.delta?.text) yield { delta: parsed.delta.text };
                break;
              case "message_delta":
                if (parsed.usage?.output_tokens) outputTokens = parsed.usage.output_tokens;
                break;
              case "message_stop":
                yield {
                  delta: "",
                  model,
                  usage: {
                    promptTokens: inputTokens,
                    completionTokens: outputTokens,
                    totalTokens: inputTokens + outputTokens,
                  },
                };
                return;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
      request.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  async ping(): Promise<PingResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        signal: controller.signal,
      });

      if (response.ok) return { ok: true };
      return {
        ok: false,
        reason: "http",
        status: response.status,
        message: `HTTP ${response.status} ${response.statusText}`.trim(),
      };
    } catch (err) {
      if (controller.signal.aborted) {
        return { ok: false, reason: "timeout", message: "timed out after 10s" };
      }
      const e = err as Error & { cause?: { code?: string } };
      return { ok: false, reason: "network", message: e.cause?.code || e.message || "network error" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

interface AnthropicStreamEvent {
  type: string;
  message?: { model?: string; usage?: { input_tokens?: number } };
  delta?: { text?: string };
  usage?: { output_tokens?: number };
}
