import { describe, it, expect } from "vitest";
import { buildMessages } from "./buildMessages";
import type { UserTurn, AssistantMessage } from "@/types";

const params = { selectedModelIds: [], systemPrompt: "", temperature: 0.7, modelParams: {} };

function makeTurn(text: string): UserTurn {
  return { id: "u1", content: [{ type: "text", text }], params, timestamp: 0 };
}
function makeResp(text: string): AssistantMessage {
  return { id: "a1", content: [{ type: "text", text }], timestamp: 0 };
}

describe("buildMessages", () => {
  it("single user turn produces one message", () => {
    const msgs = buildMessages([makeTurn("Hi")], [null], 0);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content[0]).toEqual({ type: "text", text: "Hi" });
  });

  it("includes prior assistant response as context", () => {
    const msgs = buildMessages(
      [makeTurn("Q1"), makeTurn("Q2")],
      [makeResp("A1"), null],
      1
    );
    expect(msgs).toHaveLength(3); // user, assistant, user
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[2].role).toBe("user");
  });

  it("skips errored responses in context", () => {
    const errored: AssistantMessage = {
      id: "e",
      content: [],
      timestamp: 0,
      error: "fail",
    };
    const msgs = buildMessages(
      [makeTurn("Q1"), makeTurn("Q2")],
      [errored, null],
      1
    );
    // Only user messages, errored assistant skipped
    expect(msgs).toHaveLength(2);
    expect(msgs.every((m) => m.role === "user")).toBe(true);
  });

  it("converts base64 data URL to image_base64 content", () => {
    const turn: UserTurn = {
      id: "u1",
      content: [{ type: "image_url", url: "data:image/png;base64,abc123" }],
      params,
      timestamp: 0,
    };
    const msgs = buildMessages([turn], [null], 0);
    const content = msgs[0].content[0];
    expect(content).toEqual({ type: "image_base64", data: "abc123", mediaType: "image/png" });
  });

  it("thinking blocks are stripped from context", () => {
    const turn: UserTurn = {
      id: "u1",
      content: [{ type: "text", text: "Hi" }],
      params,
      timestamp: 0,
    };
    const resp: AssistantMessage = {
      id: "a1",
      content: [
        { type: "thinking", text: "Let me think" },
        { type: "text", text: "Answer" },
      ],
      timestamp: 0,
    };
    const msgs = buildMessages([turn, makeTurn("Q2")], [resp, null], 1);
    const assistantMsg = msgs.find((m) => m.role === "assistant");
    expect(assistantMsg?.content).toHaveLength(1);
    expect(assistantMsg?.content[0]).toEqual({ type: "text", text: "Answer" });
  });
});
