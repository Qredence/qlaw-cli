import type { Message } from "./types.ts";

// Environment variables
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_MODEL = process.env.OPENAI_MODEL;
export const AF_BRIDGE_BASE_URL = process.env.AF_BRIDGE_BASE_URL;
export const AF_MODEL = process.env.AF_MODEL;

export function getAuthHeader(
  baseUrl: string | undefined,
  apiKey: string
): Record<string, string> {
  // Use Azure-compatible header if the base URL looks like Azure; otherwise standard Bearer
  if (
    baseUrl
  ) {
    let host: string | undefined;
    try {
      host = new URL(baseUrl).host;
    } catch {
      host = undefined;
    }
    // Check for *.azure.com, not substring
    if (
      (host && (host === "azure.com" || host.endsWith(".azure.com"))) ||
      baseUrl.includes("/openai/")
    ) {
      return { "api-key": apiKey };
    }
  }
  return { Authorization: `Bearer ${apiKey}` };
}

// Build a plain-text prompt from history for broad compatibility with proxies
export function buildResponsesInput(history: Message[]): string {
  const lines: string[] = [];
  for (const m of history) {
    const role =
      m.role === "assistant"
        ? "Assistant"
        : m.role === "system"
        ? "System"
        : "User";
    lines.push(`${role}: ${m.content}`);
  }
  lines.push("Assistant:");
  return lines.join("\n\n");
}

