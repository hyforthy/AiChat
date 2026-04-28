import { AlertCircle } from "lucide-react";
import type { UserTurn, AssistantMessage } from "@/types";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { ImageViewer } from "@/components/content/ImageViewer";
import { StreamingIndicator } from "./StreamingIndicator";
import { ThinkingBlock } from "./ThinkingBlock";

// Shared containment style applied to every bubble wrapper.
// width:100% gives a definite containing-block for max-width children.
// overflow:hidden clips anything that still escapes.
const CONTAIN: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
};

interface UserBubbleProps {
  turn: UserTurn;
}

export function UserBubble({ turn }: UserBubbleProps) {
  return (
    <div className="flex justify-end mb-3" style={CONTAIN}>
      <div
        className="rounded-2xl rounded-tr-sm px-4 py-2.5"
        style={{
          maxWidth: "82%",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          backgroundColor: "var(--color-accent-dim)",
          border: "1px solid var(--color-accent-border)",
          color: "var(--color-text)",
          fontSize: "var(--text-base)",
          lineHeight: 1.6,
        }}
      >
        {turn.content.map((block, i) => {
          if (block.type === "text") return <p key={i} style={{ margin: 0 }}>{block.text}</p>;
          if (block.type === "image_url") return <ImageViewer key={i} src={block.url} />;
          return null;
        })}
      </div>
    </div>
  );
}

interface AssistantBubbleProps {
  message: AssistantMessage | null;
  isStreaming: boolean;
  accentColor: string;
}

export function AssistantBubble({ message, isStreaming, accentColor }: AssistantBubbleProps) {
  if (isStreaming && !message) {
    return (
      <div className="mb-3 px-1 py-2" style={CONTAIN}>
        <StreamingIndicator color={accentColor} />
      </div>
    );
  }

  if (message?.error) {
    return (
      <div
        className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2.5"
        style={{
          ...CONTAIN,
          fontSize: "var(--text-sm)",
          color: "var(--color-error)",
          backgroundColor: "var(--color-error-bg)",
          border: "1px solid var(--color-error-border)",
        }}
      >
        <AlertCircle size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
        <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {message.error}
        </span>
      </div>
    );
  }

  if (!message) return null;

  const thinkingBlock = message.content.find((b) => b.type === "thinking");
  const textBlock    = message.content.find((b) => b.type === "text");
  const imageBlocks  = message.content.filter((b) => b.type === "image_generated");

  return (
    <div className="mb-3" style={CONTAIN}>
      {thinkingBlock?.type === "thinking" && (
        <ThinkingBlock text={thinkingBlock.text} isStreaming={isStreaming} />
      )}
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3"
        style={{
          width: "100%",
          overflow: "hidden",          // hard clip
          boxSizing: "border-box",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border-subtle)",
          fontSize: "var(--text-base)",
          lineHeight: 1.65,
          color: "var(--color-text)",
        }}
      >
        {textBlock?.type === "text" && <MarkdownRenderer content={textBlock.text} />}
        {isStreaming && <StreamingIndicator color={accentColor} />}
        {imageBlocks.map((img, i) =>
          img.type === "image_generated" ? <ImageViewer key={i} src={img.url} /> : null
        )}
      </div>
    </div>
  );
}
