export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

// Outcome of a connectivity check. Distinguishes *why* a ping failed so the CLI
// can show an actionable message instead of a generic "service down".
export interface PingResult {
  ok: boolean;
  reason?: "timeout" | "network" | "http";
  status?: number;
  message?: string;
}

export interface LLMProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>;
  ping(): Promise<PingResult>;
}
