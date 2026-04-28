import { useCallback } from "react";
import { useConversationStore } from "@/store/conversationStore";
import { useStreamStore } from "@/store/streamStore";
import { useSettingsStore } from "@/store/settingsStore";
import { callStream } from "@/lib/streaming";
import { buildMessages } from "@/lib/buildMessages";
import type { ContentBlock, RequestParams } from "@/types";
import { DEFAULT_MODEL_PARAMS } from "@/types";

export function useStream() {
  const { addUserTurn, appendChunk, appendThinking, appendGeneratedImage, setModelError } =
    useConversationStore.getState();
  const setStreaming = useStreamStore((s) => s.setStreaming);

  const sendMessage = useCallback(
    async (convId: string, content: ContentBlock[], params: RequestParams) => {
      const turnIndex = addUserTurn(convId, content, params);
      const { models } = useSettingsStore.getState();

      await Promise.allSettled(
        params.selectedModelIds.map(async (modelId) => {
          const modelConfig = models.find((m) => m.id === modelId);
          if (!modelConfig) return;

          const apiKey = modelConfig.apiKey ?? "";
          setStreaming(convId, turnIndex, modelId, true);

          try {
            // Read latest conversation state to build context
            const conv = useConversationStore
              .getState()
              .conversations.find((c) => c.id === convId);
            if (!conv) return;

            const thread = conv.threads[modelId] ?? { modelId, responses: [] };
            const messages = buildMessages(
              conv.userTurns,
              thread.responses,
              turnIndex
            );

            const modelParam = params.modelParams?.[modelId] ?? DEFAULT_MODEL_PARAMS;
            for await (const chunk of callStream(
              modelConfig,
              messages,
              modelParam.systemPrompt,
              modelParam.temperature,
              apiKey
            )) {
              if (useStreamStore.getState().stopRequested.has(convId)) break;
              if (chunk.type === "text") {
                appendChunk(convId, turnIndex, modelId, chunk.text);
              } else if (chunk.type === "thinking") {
                appendThinking(convId, turnIndex, modelId, chunk.text);
              } else if (chunk.type === "image_generated") {
                appendGeneratedImage(convId, turnIndex, modelId, chunk.url);
              }
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setModelError(convId, turnIndex, modelId, msg);
          } finally {
            setStreaming(convId, turnIndex, modelId, false);
          }
        })
      );
    },
    [addUserTurn, appendChunk, appendThinking, appendGeneratedImage, setModelError, setStreaming]
  );

  return { sendMessage };
}
