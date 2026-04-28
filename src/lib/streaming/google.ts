import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NormalizedMessage } from "@/lib/buildMessages";
import type { StreamChunk } from "@/types";

export async function* streamGoogle(
  model: string,
  baseUrl: string,
  messages: NormalizedMessage[],
  systemPrompt: string,
  temperature: number,
  apiKey: string
): AsyncGenerator<StreamChunk> {
  const client = new GoogleGenerativeAI(apiKey);
  const genModel = client.getGenerativeModel(
    { model, ...(systemPrompt ? { systemInstruction: systemPrompt } : {}) },
    baseUrl ? { baseUrl } : undefined
  );

  // Build history (all turns except the last user turn)
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: m.content.map((c) => {
      if (c.type === "text") return { text: c.text };
      return { inlineData: { mimeType: c.mediaType, data: c.data } };
    }),
  }));

  const lastMsg = messages[messages.length - 1];
  const parts = lastMsg.content.map((c) => {
    if (c.type === "text") return { text: c.text };
    return { inlineData: { mimeType: c.mediaType, data: c.data } };
  });

  const chat = genModel.startChat({
    history,
    generationConfig: { temperature },
  });

  const result = await chat.sendMessageStream(parts);

  for await (const chunk of result.stream) {
    const candidates = chunk.candidates ?? [];
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.text) {
          yield { type: "text", text: part.text };
        }
        // Gemini image generation (inlineData in response)
        if (part.inlineData) {
          const url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          yield { type: "image_generated", url };
        }
      }
      if (candidate.finishReason) {
        yield { type: "done", stopReason: candidate.finishReason };
      }
    }
  }
}
