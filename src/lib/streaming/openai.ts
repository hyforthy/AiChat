import OpenAI from "openai";
import type { NormalizedMessage } from "@/lib/buildMessages";
import type { StreamChunk } from "@/types";
import { isTauri, tauriProxyFetch } from "./proxy";

export async function* streamOpenAI(
  model: string,
  baseUrl: string,
  messages: NormalizedMessage[],
  systemPrompt: string,
  temperature: number,
  apiKey: string
): AsyncGenerator<StreamChunk> {
  const client = new OpenAI({
    apiKey: apiKey || "no-key", // some local endpoints (Ollama, LM Studio) don't require a real key
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
    // In Tauri, route through Rust to bypass WebView CORS restrictions
    ...(isTauri() ? { fetch: tauriProxyFetch } : {}),
  });

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    openaiMessages.push({ role: "system", content: systemPrompt });
  }

  for (const m of messages) {
    if (m.role === "assistant") {
      // Assistant messages are always plain text in context
      const text = m.content.find((c) => c.type === "text")?.text ?? "";
      openaiMessages.push({ role: "assistant", content: text });
    } else {
      // User messages may have images
      const hasImages = m.content.some((c) => c.type === "image_base64");
      if (hasImages) {
        openaiMessages.push({
          role: "user",
          content: m.content.map(
            (c): OpenAI.Chat.ChatCompletionContentPart => {
              if (c.type === "text") return { type: "text", text: c.text };
              return {
                type: "image_url",
                image_url: { url: `data:${c.mediaType};base64,${c.data}` },
              };
            }
          ),
        });
      } else {
        const text = m.content.find((c) => c.type === "text")?.text ?? "";
        openaiMessages.push({ role: "user", content: text });
      }
    }
  }

  const stream = await client.chat.completions.create({
    model,
    messages: openaiMessages,
    temperature,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    // o1/o3 reasoning content (when available)
    const reasoning = (delta as { reasoning_content?: string }).reasoning_content;
    if (reasoning) {
      yield { type: "thinking", text: reasoning };
    }

    if (delta.content) {
      yield { type: "text", text: delta.content };
    }

    const finishReason = chunk.choices[0]?.finish_reason;
    if (finishReason) {
      yield { type: "done", stopReason: finishReason };
    }
  }
}
