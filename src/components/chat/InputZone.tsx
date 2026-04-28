import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, Square, Paperclip, X } from "lucide-react";
import type { ContentBlock } from "@/types";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 4;

interface Props {
  onSend: (content: ContentBlock[]) => void;
  onStop?: () => void;
  streaming?: boolean;
}

export function InputZone({ onSend, onStop, streaming }: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [multiLine, setMultiLine] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const singleLineH = useRef(0);

  useEffect(() => {
    if (textareaRef.current) {
      singleLineH.current = textareaRef.current.scrollHeight;
    }
  }, []);

  const resizeAndCheck = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    const sh = el.scrollHeight;
    el.style.height = `${Math.min(sh, 160)}px`;
    setMultiLine(sh > singleLineH.current + 2);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    let prevWidth = el.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const newWidth = entries[0]?.contentRect.width ?? prevWidth;
      if (Math.abs(newWidth - prevWidth) > 1) {
        prevWidth = newWidth;
        resizeAndCheck(el);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resizeAndCheck]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    resizeAndCheck(e.target);
  };

  const handleFiles = (files: FileList) => {
    const remaining = MAX_FILES - images.length;
    const valid = Array.from(files)
      .filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE_BYTES)
      .slice(0, remaining);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImages((prev) => [...prev, { url, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const send = () => {
    if (streaming || (!text.trim() && images.length === 0)) return;
    const content: ContentBlock[] = [
      ...(text.trim() ? [{ type: "text" as const, text: text.trim() }] : []),
      ...images.map((img) => ({ type: "image_url" as const, url: img.url })),
    ];
    onSend(content);
    setText("");
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
    }
    setMultiLine(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const attachButton = (
    <button
      onClick={() => fileRef.current?.click()}
      disabled={streaming || images.length >= MAX_FILES}
      className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-40 transition-colors flex-shrink-0"
      title="附加图片"
    >
      <Paperclip size={16} />
    </button>
  );

  const actionButton = streaming ? (
    <button
      onClick={onStop}
      className="p-1.5 bg-[var(--color-error)] text-white rounded-lg hover:opacity-90 transition-opacity flex-shrink-0"
      title="停止"
    >
      <Square size={16} />
    </button>
  ) : (
    <button
      onClick={send}
      disabled={!text.trim() && images.length === 0}
      className="p-1.5 bg-[var(--color-accent)] text-white rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
      title="发送"
    >
      <Send size={16} />
    </button>
  );

  return (
    <div
      className="flex-shrink-0"
      style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-base)", padding: "10px 12px" }}
    >
      {images.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="w-12 h-12 object-cover rounded-lg border border-[var(--color-border)]"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <div
        className={`rounded-xl border border-[var(--color-border)] transition-colors focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]
          ${multiLine
            ? "flex flex-col"
            : "flex flex-row items-center gap-1 px-1.5 py-1.5"
          }`}
        style={{ backgroundColor: "var(--color-elevated)" }}
      >
        <div className={multiLine ? "hidden" : undefined}>{attachButton}</div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder="输入消息… (Shift+Enter 换行)"
          disabled={streaming}
          rows={1}
          className={`resize-none border-0 bg-transparent outline-none text-[var(--color-text)] placeholder:text-[var(--color-muted)] overflow-y-auto disabled:opacity-50
            ${multiLine ? "w-full px-3 pt-2.5 pb-1" : "flex-1 min-w-0"}`}
          style={{ fontSize: "var(--text-base)", lineHeight: "1.5" }}
        />

        <div className={multiLine ? "hidden" : undefined}>{actionButton}</div>

        <div className={`flex items-center justify-between px-1.5 py-1.5 ${!multiLine ? "hidden" : ""}`}>
          {attachButton}
          {actionButton}
        </div>
      </div>
    </div>
  );
}
