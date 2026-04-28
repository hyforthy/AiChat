import Anthropic from "@anthropic-ai/sdk";
import type { NormalizedMessage } from "@/lib/buildMessages";
import type { StreamChunk } from "@/types";
import { isTauri, tauriProxyFetch } from "./proxy";

export async function* streamAnthropic(
  model: string,
  baseUrl: string,
  messages: NormalizedMessage[],
  systemPrompt: string,
  temperature: number,
  apiKey: string
): AsyncGenerator<StreamChunk> {
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
    // In Tauri, route through Rust to bypass WebView CORS restrictions
    ...(isTauri() ? { fetch: tauriProxyFetch as unknown as typeof fetch } : {}),
  });

  const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content.map((c) => {
      if (c.type === "text") {
        return { type: "text" as const, text: c.text };
      }
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: c.mediaType as Anthropic.Messages.Base64ImageSource["media_type"],
          data: c.data,
        },
      };
    }),
  }));

  const stream = client.messages.stream({
    model,
    max_tokens: 8096,
    temperature,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: anthropicMessages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      // Extended thinking block starts
      if (event.content_block.type === "thinking") {
        // thinking content comes via delta events
      }
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text };
      } else if (event.delta.type === "thinking_delta") {
        yield { type: "thinking", text: event.delta.thinking };
      }
    } else if (event.type === "message_stop") {
      const stopReason = (event as { type: string; message?: { stop_reason?: string } }).message?.stop_reason ?? "end_turn";
      yield { type: "done", stopReason };
    }
  }
}
