import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { ModelParams } from "@/types";

interface Props {
  params: ModelParams;
  accentColor: string;
  modelName: string;
  onChange: (patch: Partial<ModelParams>) => void;
}

export function ModelParamsPanel({ params, accentColor, modelName, onChange }: Props) {
  return (
    <div
      className="px-3 py-2.5 flex-shrink-0 space-y-2.5"
      style={{
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: "6px", height: "6px", backgroundColor: accentColor }}
        />
        <span className="font-semibold truncate" style={{ fontSize: "var(--text-xs)", color: accentColor }}>
          {modelName}
        </span>
      </div>
      <div>
        <label
          className="block mb-1"
          style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}
        >
          System Prompt
        </label>
        <Textarea
          value={params.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="可选：设置角色或指令..."
          className="h-16 resize-none"
          style={{
            fontSize: "var(--text-sm)",
            backgroundColor: "var(--color-elevated)",
            color: "var(--color-text)",
          }}
        />
      </div>
      <div>
        <div className="flex items-end justify-between mb-1.5">
          <label style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            Temperature
          </label>
          <span
            className="font-mono font-semibold tabular-nums"
            style={{ fontSize: "var(--text-base)", color: accentColor, lineHeight: 1 }}
          >
            {params.temperature.toFixed(1)}
          </span>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[params.temperature]}
          onValueChange={([v]) => onChange({ temperature: v })}
        />
      </div>
    </div>
  );
}
