import type { ModelConfig } from "@/types";

export const PRESET_MODELS: ModelConfig[] = [
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.4",
    accentColor: "#34d399",
  },
  {
    id: "gemini-3-1-flash",
    name: "Gemini 3.1 Flash",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com",
    model: "gemini-3.1-flash",
    accentColor: "#fbbf24",
  },
  {
    id: "claude-sonnet-4-7",
    name: "Claude Sonnet 4.7",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-7",
    accentColor: "#a78bfa",
  },
];

export const CUSTOM_MODEL_COLORS = [
  "#f472b6", "#38bdf8", "#4ade80", "#e879f9", "#facc15", "#f87171",
];
