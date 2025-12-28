import type { AppSettings, LlmProvider } from "../types.ts";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export interface LlmConfig {
  provider: LlmProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function normalizeProvider(value: string | undefined): LlmProvider | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "openai" || normalized === "azure" || normalized === "litellm" || normalized === "custom") {
    return normalized as LlmProvider;
  }
  return undefined;
}

function inferProvider(
  baseUrl: string | undefined,
  model: string | undefined
): LlmProvider {
  const url = baseUrl || "";
  if (url.includes("azure.com") || url.includes("/openai/")) return "azure";
  if (url.includes("litellm") || url.includes("/llm/") || (model && model.includes("/"))) return "litellm";
  return "litellm";
}

export function resolveLlmConfig(settings?: AppSettings): LlmConfig | null {
  const env = {
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    litellmBaseUrl: process.env.LITELLM_BASE_URL,
    litellmApiKey: process.env.LITELLM_API_KEY,
    litellmModel: process.env.LITELLM_MODEL,
    llmProvider: process.env.LLM_PROVIDER,
  };

  const providerHint = normalizeProvider(settings?.provider) || normalizeProvider(env.llmProvider);
  const inferredProvider = inferProvider(
    settings?.endpoint || env.litellmBaseUrl || env.openaiBaseUrl,
    settings?.model || env.litellmModel || env.openaiModel
  );
  const provider = providerHint || inferredProvider;

  let baseUrl: string | undefined;
  let apiKey: string | undefined;
  let model: string | undefined;

  if (provider === "litellm") {
    baseUrl = settings?.endpoint || env.litellmBaseUrl || env.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL;
    apiKey = settings?.apiKey || env.litellmApiKey || env.openaiApiKey;
    model = settings?.model || env.litellmModel || env.openaiModel;
  } else if (provider === "openai" || provider === "azure") {
    baseUrl = settings?.endpoint || env.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL;
    apiKey = settings?.apiKey || env.openaiApiKey;
    model = settings?.model || env.openaiModel;
  } else {
    baseUrl = settings?.endpoint || env.openaiBaseUrl || env.litellmBaseUrl;
    apiKey = settings?.apiKey || env.openaiApiKey || env.litellmApiKey;
    model = settings?.model || env.openaiModel || env.litellmModel;
  }

  const resolvedBaseUrl = baseUrl;

  if (!resolvedBaseUrl || !apiKey || !model) return null;

  return {
    provider,
    baseUrl: resolvedBaseUrl,
    apiKey,
    model,
  };
}

export function getAuthHeader(config: LlmConfig): Record<string, string> {
  if (config.provider === "azure" || config.baseUrl.includes("/openai/") || config.baseUrl.includes("azure.com")) {
    return { "api-key": config.apiKey };
  }
  return { Authorization: `Bearer ${config.apiKey}` };
}

export function resolveResponsesUrl(config: LlmConfig): string {
  const base = config.baseUrl.replace(/\/$/, "");
  if (base.endsWith("/responses") || base.includes("/responses?")) return base;
  return `${base}/responses`;
}
