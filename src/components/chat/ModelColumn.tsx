import { useState, useRef, useEffect } from "react";
import { Settings2 } from "lucide-react";
import type { Conversation, ModelConfig } from "@/types";
import { DEFAULT_MODEL_PARAMS } from "@/types";
import { useStreamStore } from "@/store/streamStore";
import { useConversationStore } from "@/store/conversationStore";
import { UserBubble, AssistantBubble } from "./MessageBubble";
import { ModelParamsPanel } from "./ModelParamsPanel";

interface Props {
  conversation: Conversation;
  model: ModelConfig;
  isPrimary: boolean;
  showHeader?: boolean;
}

export function ModelColumn({ conversation, model, isPrimary, showHeader = true }: Props) {
  const [paramsOpen, setParamsOpen] = useState(false);
  const setModelParam = useConversationStore((s) => s.setModelParam);
  const streamActive = useStreamStore((s) => s.active[conversation.id]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thread = conversation.threads[model.id];
  const modelParam = conversation.modelParams?.[model.id] ?? DEFAULT_MODEL_PARAMS;

  useEffect(() => {
    setParamsOpen(false);
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <div className="flex flex-col h-full min-w-0">
      {showHeader && (
        <>
          <div
            className="flex items-center gap-2 px-3 border-b flex-shrink-0"
            style={{
              height: "38px",
              color: model.accentColor,
              backgroundColor: `${model.accentColor}06`,
              borderColor: "var(--color-border)",
            }}
          >
            <div
              className="rounded-full flex-shrink-0"
              style={{ width: "7px", height: "7px", backgroundColor: model.accentColor }}
            />
            <span
              className="truncate font-semibold flex-1"
              style={{ fontSize: "var(--text-sm)" }}
            >
              {model.name}
            </span>
            {isPrimary && (
              <span
                className="font-semibold rounded-full flex-shrink-0"
                style={{
                  fontSize: "var(--text-2xs)",
                  padding: "1px 7px",
                  backgroundColor: `${model.accentColor}20`,
                  color: model.accentColor,
                  letterSpacing: "0.03em",
                }}
              >
                主
              </span>
            )}
            <button
              onClick={() => setParamsOpen((v) => !v)}
              className="flex-shrink-0 transition-opacity"
              style={{
                color: model.accentColor,
                opacity: paramsOpen ? 1 : 0.4,
              }}
              title="模型参数"
            >
              <Settings2 size={12} />
            </button>
          </div>

          {paramsOpen && (
            <ModelParamsPanel
              params={modelParam}
              accentColor={model.accentColor}
              modelName={model.name}
              onChange={(patch) => setModelParam(conversation.id, model.id, patch)}
            />
          )}
        </>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3" style={{ minWidth: 0 }}>
        {conversation.userTurns.length === 0 && (
          <div
            className="flex items-center justify-center h-full"
            style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}
          >
            发送消息开始对话
          </div>
        )}
        {conversation.userTurns.map((turn, i) => {
          const response = thread?.responses[i] ?? null;
          const streaming = !!(streamActive?.[i]?.[model.id]);
          return (
            <div key={turn.id}>
              <UserBubble turn={turn} />
              <AssistantBubble
                message={response}
                isStreaming={streaming}
                accentColor={model.accentColor}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
