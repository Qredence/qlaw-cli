import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { applyProviderDefaults } from "../src/llm/providerDefaults";
import type { AppSettings } from "../src/types";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
});

describe("applyProviderDefaults", () => {
  test("litellm provider prefers LITELLM_* when switching from OpenAI", () => {
    process.env.LITELLM_BASE_URL = "http://litellm.local/v1";
    process.env.LITELLM_MODEL = "openai/gpt-4o-mini";
    process.env.LITELLM_API_KEY = "litellm-key";
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.OPENAI_MODEL = "gpt-4o";

    const settings: AppSettings = {
      theme: "dark",
      showTimestamps: false,
      autoScroll: true,
      version: 1,
      keybindings: { nextSuggestion: [{ name: "down" }], prevSuggestion: [{ name: "up" }], autocomplete: [{ name: "tab" }] },
      endpoint: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      provider: "openai",
    } as AppSettings;

    const next = applyProviderDefaults(settings, "litellm");
    expect(next.endpoint).toBe("http://litellm.local/v1");
    expect(next.model).toBe("openai/gpt-4o-mini");
    expect(next.apiKey).toBe("litellm-key");
  });
});
