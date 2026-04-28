import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Conversation, UserTurn, ContentBlock, RequestParams, ModelParams } from "@/types";
import { DEFAULT_MODEL_PARAMS } from "@/types";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ConversationStore {
  conversations: Conversation[];
  currentId: string | null;
  current: () => Conversation | null;
  createConversation: (initialModelId?: string) => string;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
  setConversationSelectedModels: (convId: string, ids: string[]) => void;
  setModelParam: (convId: string, modelId: string, patch: Partial<ModelParams>) => void;
  // Returns the turn index for use by the stream hook
  addUserTurn: (convId: string, content: ContentBlock[], params: RequestParams) => number;
  appendChunk: (convId: string, turnIndex: number, modelId: string, text: string) => void;
  appendThinking: (convId: string, turnIndex: number, modelId: string, text: string) => void;
  appendGeneratedImage: (convId: string, turnIndex: number, modelId: string, url: string) => void;
  setModelError: (convId: string, turnIndex: number, modelId: string, error: string) => void;
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentId: null,

      current: () => {
        const { conversations, currentId } = get();
        return conversations.find((c) => c.id === currentId) ?? null;
      },

      createConversation: (initialModelId?) => {
        const id = newId();
        const conv: Conversation = {
          id,
          title: "新对话",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userTurns: [],
          threads: {},
          selectedModelIds: initialModelId ? [initialModelId] : [],
          modelParams: {},
        };
        set((s) => ({
          conversations: [conv, ...s.conversations],
          currentId: id,
        }));
        return id;
      },

      deleteConversation: (id) =>
        set((s) => {
          const convs = s.conversations.filter((c) => c.id !== id);
          const currentId =
            s.currentId === id ? (convs[0]?.id ?? null) : s.currentId;
          return { conversations: convs, currentId };
        }),

      selectConversation: (id) => set({ currentId: id }),

      setConversationSelectedModels: (convId, ids) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId ? { ...c, selectedModelIds: ids } : c
          ),
        })),

      setModelParam: (convId, modelId, patch) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== convId ? c : {
              ...c,
              modelParams: {
                ...c.modelParams,
                [modelId]: { ...(c.modelParams?.[modelId] ?? DEFAULT_MODEL_PARAMS), ...patch },
              },
            }
          ),
        })),

      addUserTurn: (convId, content, params) => {
        const turn: UserTurn = {
          id: newId(),
          content,
          params,
          timestamp: Date.now(),
        };
        let turnIndex = 0;
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            turnIndex = c.userTurns.length;
            const title =
              c.userTurns.length === 0
                ? (content.find((b) => b.type === "text")?.text?.slice(0, 30) ?? "新对话")
                : c.title;
            // Pre-allocate a null slot in each selected model's thread
            const threads = { ...c.threads };
            params.selectedModelIds.forEach((modelId) => {
              if (!threads[modelId]) {
                threads[modelId] = { modelId, responses: [] };
              }
              while (threads[modelId].responses.length < turnIndex) {
                threads[modelId].responses.push(null);
              }
              threads[modelId] = {
                ...threads[modelId],
                responses: [...threads[modelId].responses, null],
              };
            });
            return {
              ...c,
              title,
              userTurns: [...c.userTurns, turn],
              threads,
              updatedAt: Date.now(),
            };
          }),
        }));
        return turnIndex;
      },

      appendChunk: (convId, turnIndex, modelId, text) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            const threads = { ...c.threads };
            const thread = threads[modelId] ?? { modelId, responses: [] };
            const responses = [...thread.responses];
            const existing = responses[turnIndex];
            if (existing && !existing.error) {
              // Append to the last text block, or add a new text block
              const blocks = [...existing.content];
              const lastBlock = blocks[blocks.length - 1];
              if (lastBlock?.type === "text") {
                blocks[blocks.length - 1] = {
                  type: "text",
                  text: lastBlock.text + text,
                };
              } else {
                blocks.push({ type: "text", text });
              }
              responses[turnIndex] = { ...existing, content: blocks };
            } else {
              responses[turnIndex] = {
                id: newId(),
                content: [{ type: "text", text }],
                timestamp: Date.now(),
              };
            }
            threads[modelId] = { ...thread, responses };
            return { ...c, threads };
          }),
        })),

      appendThinking: (convId, turnIndex, modelId, text) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            const threads = { ...c.threads };
            const thread = threads[modelId] ?? { modelId, responses: [] };
            const responses = [...thread.responses];
            const existing = responses[turnIndex];
            if (existing && !existing.error) {
              const blocks = [...existing.content];
              // Find or create a thinking block at the front
              const thinkingIdx = blocks.findIndex((b) => b.type === "thinking");
              if (thinkingIdx >= 0) {
                const old = blocks[thinkingIdx];
                blocks[thinkingIdx] = {
                  type: "thinking",
                  text: old.type === "thinking" ? old.text + text : text,
                };
              } else {
                blocks.unshift({ type: "thinking", text });
              }
              responses[turnIndex] = { ...existing, content: blocks };
            } else {
              responses[turnIndex] = {
                id: newId(),
                content: [{ type: "thinking", text }],
                timestamp: Date.now(),
              };
            }
            threads[modelId] = { ...thread, responses };
            return { ...c, threads };
          }),
        })),

      appendGeneratedImage: (convId, turnIndex, modelId, url) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            const threads = { ...c.threads };
            const thread = threads[modelId] ?? { modelId, responses: [] };
            const responses = [...thread.responses];
            const existing = responses[turnIndex];
            const imageBlock = { type: "image_generated" as const, url };
            if (existing && !existing.error) {
              responses[turnIndex] = {
                ...existing,
                content: [...existing.content, imageBlock],
              };
            } else {
              responses[turnIndex] = {
                id: newId(),
                content: [imageBlock],
                timestamp: Date.now(),
              };
            }
            threads[modelId] = { ...thread, responses };
            return { ...c, threads };
          }),
        })),

      setModelError: (convId, turnIndex, modelId, error) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            const threads = { ...c.threads };
            const thread = threads[modelId] ?? { modelId, responses: [] };
            const responses = [...thread.responses];
            responses[turnIndex] = {
              id: newId(),
              content: [],
              timestamp: Date.now(),
              error,
            };
            threads[modelId] = { ...thread, responses };
            return { ...c, threads };
          }),
        })),
    }),
    {
      name: "aichat-conversations",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
