import { useState } from "react";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useConversationStore } from "@/store/conversationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { SettingsModal } from "@/components/settings/SettingsModal";
import type { Conversation } from "@/types";

function groupByDate(conversations: Conversation[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];
  conversations.forEach((c) => {
    const age = now - c.updatedAt;
    if (age < DAY) today.push(c);
    else if (age < 2 * DAY) yesterday.push(c);
    else older.push(c);
  });
  return { today, yesterday, older };
}

interface Props {
  onClose?: () => void;
}

export function Sidebar({ onClose: _onClose }: Props) {
  const { conversations, currentId, createConversation, selectConversation, deleteConversation } =
    useConversationStore();
  const { models } = useSettingsStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const groups = groupByDate(conversations);

  const renderGroup = (label: string, items: Conversation[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        {/* Group label */}
        <div
          className="px-3 pt-3 pb-1 font-semibold uppercase tracking-wider"
          style={{
            fontSize: "var(--text-2xs)",
            color: "var(--color-muted)",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
        {/* Conversation items */}
        {items.map((c) => (
          <div
            key={c.id}
            className="group flex items-center gap-1 mx-1.5 mb-0.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
            style={{
              color: "var(--color-chrome-text)",
              // Selected: subtle background only, text color unchanged
              backgroundColor: c.id === currentId ? "var(--color-sel-bg)" : "transparent",
              borderRadius: "6px",
            }}
            onClick={() => selectConversation(c.id)}
          >
            <span
              className="flex-1 truncate"
              style={{ fontSize: "var(--text-sm)", lineHeight: 1.4 }}
            >
              {c.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(c.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              style={{ color: "var(--color-muted)" }}
              title="删除"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className="flex flex-col h-full"
        style={{
          width: "var(--sidebar-w)",
          backgroundColor: "var(--color-elevated)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Top: Logo + new chat */}
        <div
          className="flex items-center gap-2 px-3"
          style={{ height: "42px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
        >
          <div className="w-5 h-5 rounded-md flex-shrink-0 bg-gradient-to-br from-[#6366f1] to-[#a78bfa]" />
          <span
            className="font-bold flex-1"
            style={{ fontSize: "var(--text-md)", color: "var(--color-text)" }}
          >
            AiChat
          </span>
        </div>

        {/* New chat button */}
        <div className="px-2 pt-2">
          <button
            onClick={() => createConversation(models[0]?.id)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-dashed transition-colors font-medium"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-chrome-text)",
              borderColor: "var(--color-border)",
            }}
          >
            <Plus size={13} /> 新建对话
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto pb-1">
          {renderGroup("今天", groups.today)}
          {renderGroup("昨天", groups.yesterday)}
          {renderGroup("更早", groups.older)}
          {conversations.length === 0 && (
            <div
              className="px-4 py-8 text-center leading-relaxed"
              style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}
            >
              还没有对话
              <br />
              点击"新建对话"开始
            </div>
          )}
        </div>

        {/* Bottom: Settings */}
        <div
          className="px-2 py-2"
          style={{ borderTop: "1px solid var(--color-border-subtle)", flexShrink: 0 }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors font-medium"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-chrome-text)",
            }}
          >
            <Settings size={13} /> 设置
          </button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
