import { useState } from "react";
import { Plus, Trash2, Pencil, Eye, EyeOff } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import type { Provider } from "@/types";

const PROVIDER_OPTIONS: { value: Provider; label: string; baseUrl: string }[] = [
  { value: "custom",    label: "OpenAI 兼容",  baseUrl: "" },
  { value: "anthropic", label: "Anthropic",     baseUrl: "https://api.anthropic.com" },
  { value: "google",    label: "Google",        baseUrl: "https://generativelanguage.googleapis.com" },
];

type FormState = { name: string; baseUrl: string; model: string; provider: Provider; apiKey: string };
const emptyForm: FormState = { name: "", baseUrl: "", model: "", provider: "custom", apiKey: "" };

const inputCls = "w-full bg-[var(--color-elevated)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]";

function ProviderTabs({ value, onChange }: { value: Provider; onChange: (p: Provider) => void }) {
  return (
    <div className="flex gap-1">
      {PROVIDER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-[10px] py-1 rounded transition-colors ${
            value === opt.value
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-elevated)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ApiKeyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder="API Key"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " pr-8"}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

export function ModelList() {
  const { models, addModel, updateModel, removeModel } = useSettingsStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const setField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setEditField = (key: keyof FormState, value: string) =>
    setEditForm((f) => ({ ...f, [key]: value }));

  const setProvider = (provider: Provider) => {
    const opt = PROVIDER_OPTIONS.find((o) => o.value === provider)!;
    setForm((f) => ({ ...f, provider, baseUrl: opt.baseUrl }));
  };

  const setEditProvider = (provider: Provider) => {
    const opt = PROVIDER_OPTIONS.find((o) => o.value === provider)!;
    setEditForm((f) => ({ ...f, provider, baseUrl: opt.baseUrl }));
  };

  const startEdit = (id: string) => {
    const m = models.find((m) => m.id === id)!;
    // "openai" and "custom" both use OpenAI-compatible adapter; unify to "custom" in UI
    const provider: Provider = m.provider === "openai" ? "custom" : m.provider;
    setEditForm({ name: m.name, baseUrl: m.baseUrl, model: m.model, provider, apiKey: m.apiKey ?? "" });
    setEditingId(id);
    setAdding(false);
  };

  const submitEdit = () => {
    if (!editForm.name.trim() || !editForm.model.trim()) return;
    if (!editForm.baseUrl.trim()) return;
    updateModel(editingId!, editForm);
    setEditingId(null);
  };

  const submit = () => {
    if (!form.name.trim() || !form.model.trim()) return;
    if (!form.baseUrl.trim()) return;
    addModel({ id: `custom-${Date.now()}`, ...form });
    setAdding(false);
    setForm(emptyForm);
  };

  const renderForm = (
    f: FormState,
    onProvider: (p: Provider) => void,
    onField: (k: keyof FormState, v: string) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string,
    borderCls: string
  ) => (
    <div className={`border ${borderCls} rounded-lg p-3 space-y-2 bg-[var(--color-surface)]`}>
      <ProviderTabs value={f.provider} onChange={onProvider} />
      <input
        placeholder="显示名称"
        value={f.name}
        onChange={(e) => onField("name", e.target.value)}
        className={inputCls}
      />
      <input
        placeholder="Base URL（如 https://api.anthropic.com）"
        value={f.baseUrl}
        onChange={(e) => onField("baseUrl", e.target.value)}
        className={inputCls}
      />
      <input
        placeholder="模型 ID（如 claude-3-5-sonnet-20241022）"
        value={f.model}
        onChange={(e) => onField("model", e.target.value)}
        className={inputCls}
      />
      <ApiKeyInput value={f.apiKey} onChange={(v) => onField("apiKey", v)} />
      <div className="flex gap-2">
        <button onClick={onSave} className="text-xs px-3 py-1.5 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity">
          {saveLabel}
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 bg-[var(--color-elevated)] text-[var(--color-muted)] rounded-lg border border-[var(--color-border)] hover:text-[var(--color-text)]">
          取消
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {models.map((m) => (
        <div key={m.id}>
          {editingId === m.id
            ? renderForm(editForm, setEditProvider, setEditField, submitEdit, () => setEditingId(null), "保存", "border-[var(--color-accent)]")
            : (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)]">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.accentColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)] truncate">{m.name}</div>
                  <div className="text-xs text-[var(--color-muted)] truncate">{m.model}</div>
                </div>
<button onClick={() => startEdit(m.id)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors flex-shrink-0" title="编辑模型">
                  <Pencil size={14} />
                </button>
                <button onClick={() => removeModel(m.id)} className="text-[var(--color-muted)] hover:text-red-400 transition-colors flex-shrink-0" title="删除模型">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          }
        </div>
      ))}

      {adding
        ? renderForm(form, setProvider, setField, submit, () => { setAdding(false); setForm(emptyForm); }, "添加", "border-[var(--color-border)]")
        : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] p-2 transition-colors">
            <Plus size={14} /> 添加自定义模型
          </button>
        )
      }
    </div>
  );
}
