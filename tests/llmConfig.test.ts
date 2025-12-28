import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { resolveLlmConfig, getAuthHeader } from "../src/llm/config";
import type { AppSettings } from "../src/types";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
});

describe("resolveLlmConfig", () => {
  test("custom provider requires explicit settings", () => {
    const settings: AppSettings = {
      theme: "dark",
      showTimestamps: false,
      autoScroll: true,
      version: 1,
      keybindings: { nextSuggestion: [{ name: "down" }], prevSuggestion: [{ name: "up" }], autocomplete: [{ name: "tab" }] },
      provider: "custom",
    } as AppSettings;
    const cfg = resolveLlmConfig(settings);
    expect(cfg).toBeNull();
  });

  test("infers azure provider from host and uses api-key header", () => {
    delete process.env.LLM_PROVIDER;
    const settings: AppSettings = {
      theme: "dark",
      showTimestamps: false,
      autoScroll: true,
      version: 1,
      keybindings: { nextSuggestion: [{ name: "down" }], prevSuggestion: [{ name: "up" }], autocomplete: [{ name: "tab" }] },
      endpoint: "https://example.openai.azure.com/openai/deployments/foo",
      apiKey: "azure-key",
      model: "gpt-4o",
    } as AppSettings;
    const cfg = resolveLlmConfig(settings);
    expect(cfg?.provider).toBe("azure");
    expect(getAuthHeader(cfg!)).toEqual({ "api-key": "azure-key" });
  });

  test("litellm provider falls back to OpenAI env when LiteLLM env missing", () => {
    process.env.LLM_PROVIDER = "litellm";
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    delete process.env.LITELLM_BASE_URL;
    delete process.env.LITELLM_API_KEY;
    delete process.env.LITELLM_MODEL;

    const cfg = resolveLlmConfig({} as AppSettings);
    expect(cfg?.provider).toBe("litellm");
    expect(cfg?.baseUrl).toBe("https://api.openai.com/v1");
    expect(cfg?.apiKey).toBe("openai-key");
    expect(cfg?.model).toBe("gpt-4o-mini");
  });
});
