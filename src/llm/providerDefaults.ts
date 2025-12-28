import type { AppSettings, LlmProvider } from "../types.ts";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function normalizeProvider(provider?: string): LlmProvider | undefined {
  if (!provider) return undefined;
  const normalized = provider.toLowerCase();
  if (normalized === "openai" || normalized === "azure" || normalized === "litellm" || normalized === "custom") {
    return normalized as LlmProvider;
  }
  return undefined;
}

function isOpenAIEndpoint(endpoint: string | undefined, envOpenaiBase: string | undefined): boolean {
  if (!endpoint) return true;
  if (envOpenaiBase && endpoint === envOpenaiBase) return true;
  if (endpoint === DEFAULT_OPENAI_BASE_URL) return true;
  return endpoint.includes("api.openai.com");
}

export function applyProviderDefaults(settings: AppSettings, provider?: string): AppSettings {
  const normalized = normalizeProvider(provider);
  if (!normalized) {
    return { ...settings, provider };
  }

  const env = {
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    litellmBaseUrl: process.env.LITELLM_BASE_URL,
    litellmApiKey: process.env.LITELLM_API_KEY,
    litellmModel: process.env.LITELLM_MODEL,
  };

  const next: AppSettings = { ...settings, provider: normalized };

  if (normalized === "litellm") {
    if (isOpenAIEndpoint(next.endpoint, env.openaiBaseUrl)) {
      next.endpoint = env.litellmBaseUrl || undefined;
    }
    if (!next.model || (env.openaiModel && next.model === env.openaiModel)) {
      next.model = env.litellmModel || undefined;
    }
    if (!next.apiKey || (env.openaiApiKey && next.apiKey === env.openaiApiKey)) {
      next.apiKey = env.litellmApiKey || undefined;
    }
  }

  if (normalized === "openai") {
    if (!next.endpoint || next.endpoint === env.litellmBaseUrl) {
      next.endpoint = env.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL;
    }
    if (!next.model || (env.litellmModel && next.model === env.litellmModel)) {
      next.model = env.openaiModel || next.model;
    }
    if (!next.apiKey || (env.litellmApiKey && next.apiKey === env.litellmApiKey)) {
      next.apiKey = env.openaiApiKey || next.apiKey;
    }
  }

  return next;
}
