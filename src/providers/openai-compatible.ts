import type { LLMProvider, ChatRequest, ChatResponse, StreamChunk } from "./types.js";

export class OpenAICompatibleProvider implements LLMProvider {
  name: string;
  private baseUrl: string;
  private apiKey: string;
  private idleTimeout: number;

  constructor(baseUrl: string, apiKey?: string, idleTimeout?: number, name?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey || "";
    // Idle timeout: abort only after this many ms of *silence*. Because we stream,
    // every token (and every keepalive comment slow free tiers send while queued)
    // resets the window — so a model that responds slowly but steadily never aborts.
    this.idleTimeout = idleTimeout || 120_000; // 2 minutes of silence
    this.name = name || "openai";
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

  /**
   * Shared streaming core for both chat() and chatStream(). Always requests
   * stream:true so we can enforce an *idle* timeout (reset on every received
   * chunk) instead of a hard total-time cap — the key to surviving slow models.
   */
  private async *streamRaw(
    request: ChatRequest,
  ): AsyncGenerator<{ delta: string; model?: string; usage?: ChatResponse["usage"] }> {
    const controller = new AbortController();
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => controller.abort(), this.idleTimeout);
    };
    armIdle();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
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

        // Any byte of progress (token OR keepalive comment) keeps us alive.
        armIdle();

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          // Skip blanks and SSE comment/keepalive lines (start with ":").
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data) as OpenAIStreamChunk;
            const delta = parsed.choices?.[0]?.delta?.content || "";
            const usage = parsed.usage
              ? {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                }
              : undefined;

            if (delta || usage || parsed.model) {
              yield { delta, model: parsed.model, usage };
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// OpenAI-compatible streaming chunk (also carries model/usage on some providers)
interface OpenAIStreamChunk {
  model?: string;
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
