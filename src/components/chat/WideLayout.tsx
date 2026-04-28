import type { Conversation, ModelConfig } from "@/types";
import { ModelColumn } from "./ModelColumn";

const MIN_COL_WIDTH = 280; // px — below this columns become unreadable

interface Props {
  conversation: Conversation;
  selectedModels: ModelConfig[];
}

export function WideLayout({ conversation, selectedModels }: Props) {
  return (
    <div
      className="flex flex-1 overflow-x-auto overflow-y-hidden"
      style={{ scrollbarWidth: "thin" }}
    >
      {selectedModels.map((model, index) => (
        <div
          key={model.id}
          className="flex flex-col flex-1 overflow-hidden"
          style={{
            minWidth: `${MIN_COL_WIDTH}px`,
            borderRight: index < selectedModels.length - 1
              ? "1px solid var(--color-border)"
              : "none",
          }}
        >
          <ModelColumn
            conversation={conversation}
            model={model}
            isPrimary={index === 0}
          />
        </div>
      ))}
    </div>
  );
}
