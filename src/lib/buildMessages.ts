import type { UserTurn, AssistantMessage, ContentBlock } from "@/types";

export interface NormalizedMessage {
  role: "user" | "assistant";
  content: NormalizedContent[];
}

export type NormalizedContent =
  | { type: "text"; text: string }
  | { type: "image_base64"; data: string; mediaType: string };

function blocksToNormalized(blocks: ContentBlock[]): NormalizedContent[] {
  return blocks.flatMap((b): NormalizedContent[] => {
    if (b.type === "text") return [{ type: "text", text: b.text }];
    if (b.type === "thinking") return [];
    if (b.type === "image_url") {
      const [header, data] = b.url.split(",");
      const mediaType = header.replace("data:", "").replace(";base64", "");
      return [{ type: "image_base64", data, mediaType }];
    }
    // image_generated: models can't receive their own output as input
    return [{ type: "text", text: `[image: ${b.url}]` }];
  });
}

function assistantToNormalized(msg: AssistantMessage): NormalizedContent[] {
  // Only include text blocks in context (no thinking, no images)
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => ({ type: "text" as const, text: (b as { type: "text"; text: string }).text }));
}

/**
 * Build the message array for a given model up to and including the given turn index.
 * Prior assistant responses are included as context (errored turns are skipped).
 */
export function buildMessages(
  userTurns: UserTurn[],
  responses: (AssistantMessage | null)[],
  upToTurnIndex: number
): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];
  for (let i = 0; i <= upToTurnIndex; i++) {
    messages.push({
      role: "user",
      content: blocksToNormalized(userTurns[i].content),
    });
    // Include prior assistant turn as context (but not the current turn being generated)
    if (i < upToTurnIndex) {
      const resp = responses[i];
      if (resp && !resp.error) {
        const content = assistantToNormalized(resp);
        if (content.length > 0) {
          messages.push({ role: "assistant", content });
        }
      }
    }
  }
  return messages;
}
