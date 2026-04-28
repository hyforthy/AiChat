import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { ModelBar } from "@/components/chat/ModelBar";
import { WideLayout } from "@/components/chat/WideLayout";
import { NarrowLayout } from "@/components/chat/NarrowLayout";
import { InputZone } from "@/components/chat/InputZone";
import { useConversationStore } from "@/store/conversationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useStreamStore } from "@/store/streamStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { useStream } from "@/hooks/useStream";
import { useTheme } from "@/hooks/useTheme";
import type { ContentBlock, RequestParams } from "@/types";

export function AppShell() {
  useTheme();

  const { current, currentId, createConversation, setConversationSelectedModels } = useConversationStore();
  const { defaultParams, models } = useSettingsStore();
  const streaming = useStreamStore((s) => {
    if (!currentId) return false;
    const conv = s.active[currentId];
    if (!conv) return false;
    return Object.values(conv).some((t) => Object.keys(t).length > 0);
  });
  const requestStop = useStreamStore((s) => s.requestStop);
  const { sendMessage } = useStream();
  const { mode, ref } = useAdaptiveLayout(900);

  const [params, setParams] = useState<RequestParams>({
    selectedModelIds: defaultParams.selectedModelIds,
    modelParams: {},
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const created = useRef(false);

  // When switching conversations, load that conversation's selected models
  useEffect(() => {
    const conv = current();
    if (conv?.selectedModelIds?.length) {
      setParams((prev) => ({ ...prev, selectedModelIds: conv.selectedModelIds }));
    }
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist selected models back to the current conversation
  useEffect(() => {
    if (currentId) {
      setConversationSelectedModels(currentId, params.selectedModelIds);
    }
  }, [params.selectedModelIds, currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-create first conversation only once, default to first model
  useEffect(() => {
    if (!currentId && !created.current) {
      created.current = true;
      createConversation(models[0]?.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-collapse sidebar when entering narrow mode; never auto-expand (user controls that)
  useEffect(() => {
    if (mode === "narrow") setSidebarOpen(false);
  }, [mode]);

  const conversation = current();

  const orderedModels = params.selectedModelIds
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  const handleSend = async (content: ContentBlock[]) => {
    if (!currentId || orderedModels.length === 0) return;
    const conv = current();
    const sendParams: RequestParams = {
      selectedModelIds: params.selectedModelIds,
      modelParams: conv?.modelParams ?? {},
    };
    await sendMessage(currentId, content, sendParams);
  };

  return (
    <div className="flex h-full overflow-hidden bg-[var(--color-base)] text-[var(--color-text)]">
      {/* Sidebar with slide transition */}
      <div
        className="relative z-30 flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out"
        style={{ width: sidebarOpen ? "var(--sidebar-w)" : "0px" }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Backdrop for narrow mode when sidebar open */}
      {sidebarOpen && mode === "narrow" && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" ref={ref}>
        <ModelBar
          params={params}
          onParamsChange={(p) => setParams((prev) => ({ ...prev, ...p }))}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        {conversation && orderedModels.length > 0 ? (
          mode === "wide" ? (
            <WideLayout conversation={conversation} selectedModels={orderedModels} />
          ) : (
            <NarrowLayout conversation={conversation} selectedModels={orderedModels} />
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--color-muted)]">
            <span style={{ fontSize: "var(--text-sm)" }}>
              {orderedModels.length === 0
                ? "请在上方选择至少一个模型"
                : "点击 + 新建对话开始"}
            </span>
          </div>
        )}

        <InputZone
          onSend={handleSend}
          streaming={streaming}
          onStop={() => currentId && requestStop(currentId)}
        />
      </div>
    </div>
  );
}
