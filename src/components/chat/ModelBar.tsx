import { useRef } from "react";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import type { RequestParams } from "@/types";

interface Props {
  params: RequestParams;
  onParamsChange: (p: Partial<RequestParams>) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ModelBar({ params, onParamsChange, sidebarOpen, onToggleSidebar }: Props) {
  const models = useSettingsStore((s) => s.models);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      scrollRef.current?.scrollBy({ left: e.key === "ArrowLeft" ? -120 : 120, behavior: "smooth" });
    }
  };

  const toggle = (id: string) => {
    const selected = params.selectedModelIds;
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    if (next.length > 0) onParamsChange({ selectedModelIds: next });
  };

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: "42px",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-base)",
      }}
    >
      {/* Left: sidebar toggle — fixed */}
      <div className="flex items-center gap-1.5 px-2 flex-shrink-0">
        <button
          onClick={onToggleSidebar}
          className="flex-shrink-0 flex items-center justify-center rounded transition-opacity hover:opacity-100 opacity-60"
          style={{ width: "28px", height: "28px", color: "var(--color-chrome-text)" }}
          title={sidebarOpen ? "折叠侧边栏" : "展开侧边栏"}
        >
          {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>
        <div className="w-px self-stretch my-2" style={{ background: "var(--color-border)" }} />
      </div>

      {/* Middle: model chips — scrollable, keyboard-navigable */}
      <div
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1.5 flex-1 overflow-x-auto px-1 outline-none"
        style={{ scrollbarWidth: "none" }}
      >
        {models.map((model) => {
          const selected = params.selectedModelIds.includes(model.id);
          const isPrimary = params.selectedModelIds[0] === model.id && selected;
          return (
            <button
              key={model.id}
              tabIndex={-1}
              onClick={() => toggle(model.id)}
              className="flex items-center gap-1.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0 font-medium outline-none"
              style={{
                fontSize: "var(--text-xs)",
                padding: "3px 10px",
                color: "var(--color-chrome-text)",
                backgroundColor: selected ? "var(--color-sel-bg)" : "transparent",
                borderColor: selected ? "var(--color-sel-border)" : "var(--color-unsel-border)",
              }}
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{
                  width: "5px",
                  height: "5px",
                  backgroundColor: selected ? model.accentColor : "var(--color-border)",
                }}
              />
              {model.name}
              {isPrimary && (
                <span className="font-semibold opacity-60" style={{ fontSize: "var(--text-2xs)" }}>
                  主
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
