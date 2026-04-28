import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import type { Conversation, ModelConfig } from "@/types";
import { DEFAULT_MODEL_PARAMS } from "@/types";
import { useConversationStore } from "@/store/conversationStore";
import { ModelColumn } from "./ModelColumn";
import { ModelParamsPanel } from "./ModelParamsPanel";

interface Props {
  conversation: Conversation;
  selectedModels: ModelConfig[];
}

export function NarrowLayout({ conversation, selectedModels }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paramsOpen, setParamsOpen] = useState(false);
  const setModelParam = useConversationStore((s) => s.setModelParam);
  const safeIndex = Math.min(activeIndex, selectedModels.length - 1);
  const active = selectedModels[safeIndex];

  useEffect(() => {
    setParamsOpen(false);
  }, [conversation.id]);

  const activeModelParam = active
    ? (conversation.modelParams?.[active.id] ?? DEFAULT_MODEL_PARAMS)
    : DEFAULT_MODEL_PARAMS;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab bar — always shown in narrow mode */}
      <div
        className="flex flex-shrink-0 items-stretch"
        style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-base)" }}
      >
        <div className="flex flex-1 min-w-0">
          {selectedModels.map((model, index) => (
            <button
              key={model.id}
              onClick={() => setActiveIndex(index)}
              className="flex items-center justify-center gap-1 px-2 border-b transition-colors font-medium min-w-0"
              style={{
                flex: 1,
                fontSize: "var(--text-xs)",
                height: "28px",
                overflow: "hidden",
                ...(index === safeIndex
                  ? { color: model.accentColor, borderColor: model.accentColor }
                  : { color: "var(--color-text-secondary)", borderColor: "transparent" }),
              }}
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: "6px", height: "6px", backgroundColor: model.accentColor }}
              />
              <span className="truncate">{model.name}</span>
              {index === 0 && (
                <span
                  className="font-semibold ml-0.5 flex-shrink-0"
                  style={{ fontSize: "var(--text-2xs)", opacity: 0.6 }}
                >
                  主
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Gear icon for active model */}
        {active && (
          <button
            onClick={() => setParamsOpen((v) => !v)}
            className="flex-shrink-0 flex items-center justify-center px-2 border-l transition-opacity"
            style={{
              borderColor: "var(--color-border)",
              color: active.accentColor,
              opacity: paramsOpen ? 1 : 0.4,
            }}
            title="模型参数"
          >
            <Settings2 size={11} />
          </button>
        )}
      </div>

      {paramsOpen && active && (
        <ModelParamsPanel
          params={activeModelParam}
          accentColor={active.accentColor}
          modelName={active.name}
          onChange={(patch) => setModelParam(conversation.id, active.id, patch)}
        />
      )}

      {active && (
        <ModelColumn
          conversation={conversation}
          model={active}
          isPrimary={safeIndex === 0}
          showHeader={false}
        />
      )}
    </div>
  );
}
