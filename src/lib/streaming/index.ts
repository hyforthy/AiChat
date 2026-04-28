import type { ModelConfig, StreamChunk } from "@/types";
import type { NormalizedMessage } from "@/lib/buildMessages";
import { streamAnthropic } from "./anthropic";
import { streamOpenAI } from "./openai";
import { streamGoogle } from "./google";

export async function* callStream(
  model: ModelConfig,
  messages: NormalizedMessage[],
  systemPrompt: string,
  temperature: number,
  apiKey: string
): AsyncGenerator<StreamChunk> {
  switch (model.provider) {
    case "anthropic":
      yield* streamAnthropic(model.model, model.baseUrl, messages, systemPrompt, temperature, apiKey);
      break;
    case "openai":
    case "custom":
      // Custom models must be OpenAI-compatible
      yield* streamOpenAI(model.model, model.baseUrl, messages, systemPrompt, temperature, apiKey);
      break;
    case "google":
      yield* streamGoogle(model.model, model.baseUrl, messages, systemPrompt, temperature, apiKey);
      break;
  }
}
