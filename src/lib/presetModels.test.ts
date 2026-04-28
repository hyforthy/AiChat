import { describe, it, expect } from "vitest";
import { PRESET_MODELS } from "./presetModels";

describe("PRESET_MODELS", () => {
  it("has 6 models", () => expect(PRESET_MODELS).toHaveLength(6));

  it("all have required fields", () => {
    PRESET_MODELS.forEach((m) => {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.model).toBeTruthy();
      expect(m.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("ids are unique", () => {
    const ids = PRESET_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all three major providers", () => {
    const providers = new Set(PRESET_MODELS.map((m) => m.provider));
    expect(providers.has("anthropic")).toBe(true);
    expect(providers.has("openai")).toBe(true);
    expect(providers.has("google")).toBe(true);
  });
});
