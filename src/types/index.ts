export type Provider = "anthropic" | "openai" | "google" | "custom";

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  baseUrl: string;
  model: string;
  accentColor: string;
  apiKey?: string; // per-model key; if empty, falls back to provider-level shared key
}

// Content blocks stored in conversation history
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; url: string }        // user-uploaded image, always a data URL (base64)
  | { type: "image_generated"; url: string }  // model-generated image
  | { type: "thinking"; text: string };       // Claude extended thinking / o1 reasoning

// Unified chunk type yielded by all streaming adapters
export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "image_generated"; url: string }
  | { type: "done"; stopReason: string };

export interface ModelParams {
  systemPrompt: string;
  temperature: number;
}

export const DEFAULT_MODEL_PARAMS: ModelParams = { systemPrompt: "", temperature: 1.0 };

export interface RequestParams {
  selectedModelIds: string[];
  modelParams: Record<string, ModelParams>;
}

export interface UserTurn {
  id: string;
  content: ContentBlock[];
  params: RequestParams;
  timestamp: number;
}

export interface AssistantMessage {
  id: string;
  content: ContentBlock[];
  timestamp: number;
  error?: string;
}

export interface Thread {
  modelId: string;
  // Each element aligns with userTurns by index; null if model didn't participate that turn
  responses: (AssistantMessage | null)[];
}

export interface Conversation {
  id: string;
  title: string;       // derived from first user message (max 30 chars), never updated after
  createdAt: number;
  updatedAt: number;
  userTurns: UserTurn[];
  threads: Record<string, Thread>; // key = ModelConfig.id, stores only assistant responses
  selectedModelIds: string[];
  modelParams: Record<string, ModelParams>;
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  defaultParams: RequestParams;
  models: ModelConfig[];
}

export type LayoutMode = "wide" | "narrow";
