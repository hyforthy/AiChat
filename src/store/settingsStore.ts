import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppSettings, ModelConfig } from "@/types";
import { PRESET_MODELS, CUSTOM_MODEL_COLORS } from "@/lib/presetModels";

const PRESET_IDS = new Set(PRESET_MODELS.map((m) => m.id));

// IDs that were preset models in previous versions — used to filter them out on migration
const LEGACY_PRESET_IDS = new Set([
  "claude-3-5-sonnet",
  "claude-3-opus",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-1-5-pro",
  "gemini-1-5-flash",
]);

interface SettingsStore extends AppSettings {
  setTheme: (theme: AppSettings["theme"]) => void;
  setDefaultParams: (params: Partial<AppSettings["defaultParams"]>) => void;
  addModel: (model: Omit<ModelConfig, "accentColor">) => void;
  updateModel: (id: string, updates: Partial<Omit<ModelConfig, "id" | "accentColor">>) => void;
  removeModel: (id: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      defaultParams: {
        selectedModelIds: [PRESET_MODELS[0].id],
        modelParams: {},
      },
      models: PRESET_MODELS,

      setTheme: (theme) => set({ theme }),

      setDefaultParams: (params) =>
        set((s) => ({ defaultParams: { ...s.defaultParams, ...params } })),

      addModel: (model) => {
        const customModels = get().models.filter((m) => !PRESET_IDS.has(m.id));
        const color = CUSTOM_MODEL_COLORS[customModels.length % CUSTOM_MODEL_COLORS.length];
        set((s) => ({ models: [...s.models, { ...model, accentColor: color }] }));
      },

      updateModel: (id, updates) =>
        set((s) => ({
          models: s.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      removeModel: (id) =>
        set((s) => ({ models: s.models.filter((m) => m.id !== id) })),
    }),
    {
      name: "aichat-settings",
      version: 3,
      migrate: (persisted, fromVersion) => {
        const s = persisted as Partial<AppSettings>;
        if (fromVersion < 3) {
          const customModels = (s.models ?? []).filter(
            (m) => !LEGACY_PRESET_IDS.has(m.id) && !PRESET_IDS.has(m.id)
          );
          return {
            ...s,
            models: [...PRESET_MODELS, ...customModels],
            defaultParams: {
              selectedModelIds: [PRESET_MODELS[0].id],
              modelParams: {},
            },
          };
        }
        return s;
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
);
