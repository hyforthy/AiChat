import { useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";

const COLLAPSE_THRESHOLD = 20;

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: Props) {
  const lines = code.split("\n").length;
  const collapsible = lines > COLLAPSE_THRESHOLD;
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(collapsible);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden my-2 text-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-elevated)] border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-muted)] font-mono">
          {language ?? "text"}
        </span>
        <div className="flex items-center gap-3">
          {collapsible && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              {collapsed ? `展开 ${lines} 行` : "折叠"}
            </button>
          )}
          <button
            onClick={copy}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            title="复制代码"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <pre className="p-3 overflow-x-auto bg-[var(--color-surface)]">
          <code className={language ? `language-${language}` : ""}>{code}</code>
        </pre>
      )}
    </div>
  );
}
