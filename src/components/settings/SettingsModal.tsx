import { useState } from "react";
import { X, Cpu, Palette } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { ModelList } from "./ModelList";

type Tab = "models" | "appearance";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "models", label: "模型", icon: <Cpu size={14} /> },
  { id: "appearance", label: "外观", icon: <Palette size={14} /> },
];

export function SettingsModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("models");
  const { theme, setTheme } = useSettingsStore();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-h-[80vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left nav */}
        <div className="w-36 flex-shrink-0 bg-[var(--color-elevated)] border-r border-[var(--color-border)] p-2">
          <div className="text-xs font-bold text-[var(--color-text)] px-2 py-1.5 mb-1">
            设置
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium mb-0.5 transition-colors"
              style={
                tab === t.id
                  ? { backgroundColor: "var(--color-accent)", color: "white", opacity: 0.9 }
                  : { color: "var(--color-muted)" }
              }
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {TABS.find((t) => t.id === tab)?.label}
            </span>
            <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "models" && <ModelList />}
            {tab === "appearance" && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--color-text)] mb-3">主题</div>
                {(
                  [
                    { value: "dark", label: "🌙 深色" },
                    { value: "light", label: "☀️ 浅色" },
                    { value: "system", label: "💻 跟随系统" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors"
                    style={
                      theme === opt.value
                        ? {
                            borderColor: "var(--color-accent)",
                            backgroundColor: `color-mix(in srgb, var(--color-accent) 10%, transparent)`,
                            color: "var(--color-accent)",
                          }
                        : { borderColor: "var(--color-border)", color: "var(--color-text)" }
                    }
                  >
                    {opt.label}
                    {theme === opt.value && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
