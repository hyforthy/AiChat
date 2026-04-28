import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";

interface Props {
  text: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ text, isStreaming }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2 border border-[var(--color-border)] rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--color-elevated)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <Brain size={12} />
        <span className="flex-1 text-left font-medium">
          {isStreaming ? "思考中..." : "查看思考过程"}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 py-2 text-[var(--color-muted)] whitespace-pre-wrap bg-[var(--color-surface)] leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}
