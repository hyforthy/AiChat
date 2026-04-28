import { describe, it, expect, beforeEach } from "vitest";
import { useConversationStore } from "./conversationStore";

const params = { selectedModelIds: ["m1"], systemPrompt: "", temperature: 0.7, modelParams: {} as any };

beforeEach(() => {
  useConversationStore.setState({ conversations: [], currentId: null });
});

describe("conversationStore", () => {
  it("creates a conversation and sets it current", () => {
    const id = useConversationStore.getState().createConversation();
    const { conversations, currentId } = useConversationStore.getState();
    expect(conversations).toHaveLength(1);
    expect(currentId).toBe(id);
  });

  it("sets title from first user message text", () => {
    const id = useConversationStore.getState().createConversation();
    useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "Hello world" }], params);
    const conv = useConversationStore.getState().conversations[0];
    expect(conv.title).toBe("Hello world");
  });

  it("title never updates after first turn", () => {
    const id = useConversationStore.getState().createConversation();
    useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "First" }], params);
    useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "Second" }], params);
    const conv = useConversationStore.getState().conversations[0];
    expect(conv.title).toBe("First");
  });

  it("appends text chunks sequentially", () => {
    const id = useConversationStore.getState().createConversation();
    const turn = useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "Hi" }], params);
    useConversationStore.getState().appendChunk(id, turn, "m1", "Hello");
    useConversationStore.getState().appendChunk(id, turn, "m1", " world");
    const resp =
      useConversationStore.getState().conversations[0].threads["m1"].responses[turn];
    expect(resp?.content[0]).toEqual({ type: "text", text: "Hello world" });
  });

  it("appendThinking creates a thinking block at the front", () => {
    const id = useConversationStore.getState().createConversation();
    const turn = useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "Hi" }], params);
    useConversationStore.getState().appendThinking(id, turn, "m1", "Let me think...");
    useConversationStore.getState().appendChunk(id, turn, "m1", "Answer");
    const resp =
      useConversationStore.getState().conversations[0].threads["m1"].responses[turn];
    expect(resp?.content[0]).toEqual({ type: "thinking", text: "Let me think..." });
    expect(resp?.content[1]).toEqual({ type: "text", text: "Answer" });
  });

  it("appendGeneratedImage adds image block", () => {
    const id = useConversationStore.getState().createConversation();
    const turn = useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "Hi" }], params);
    useConversationStore
      .getState()
      .appendGeneratedImage(id, turn, "m1", "https://example.com/img.png");
    const resp =
      useConversationStore.getState().conversations[0].threads["m1"].responses[turn];
    expect(resp?.content[0]).toEqual({
      type: "image_generated",
      url: "https://example.com/img.png",
    });
  });

  it("records error for a model", () => {
    const id = useConversationStore.getState().createConversation();
    const turn = useConversationStore
      .getState()
      .addUserTurn(id, [{ type: "text", text: "Hi" }], params);
    useConversationStore.getState().setModelError(id, turn, "m1", "Rate limit");
    const resp =
      useConversationStore.getState().conversations[0].threads["m1"].responses[turn];
    expect(resp?.error).toBe("Rate limit");
  });

  it("deletes a conversation and falls back to next", () => {
    const id1 = useConversationStore.getState().createConversation();
    const id2 = useConversationStore.getState().createConversation();
    useConversationStore.getState().deleteConversation(id2);
    const { conversations, currentId } = useConversationStore.getState();
    expect(conversations.map((c) => c.id)).not.toContain(id2);
    expect(currentId).toBe(id1);
  });
});
