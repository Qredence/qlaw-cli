/**
 * Streaming service for handling AI response streams
 * Extracted from index.tsx to improve code organization
 */

import type { Message } from "../types.ts";
import { getAuthHeader, buildResponsesInput, getOpenAIEnv } from "../api.ts";
import { parseSSEStream } from "../sse.ts";
import { formatRequestInfoForDisplay } from "../af.ts";

export interface StreamingCallbacks {
  onDelta: (text: string) => void;
  onError: (err: Error) => void;
  onDone: () => void;
}

/**
 * Stream response from OpenAI Responses API
 */
export async function streamResponseFromOpenAI(params: {
  history: Message[];
  callbacks: StreamingCallbacks;
}): Promise<void> {
  const { history, callbacks } = params;
  const { onDelta, onError, onDone } = callbacks;

  const { baseUrl, apiKey, model } = getOpenAIEnv();
  if (!baseUrl || !apiKey || !model) {
    onError(
      new Error("Missing OPENAI_BASE_URL, OPENAI_API_KEY, or OPENAI_MODEL")
    );
    onDone();
    return;
  }

  try {
    const authHeaders = getAuthHeader(baseUrl, apiKey);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders,
    };

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        input: buildResponsesInput(history),
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
      );
    }

    const reader = res.body.getReader();
    await parseSSEStream(reader, {
      onDelta,
      onError,
      onTraceComplete: (payload) => {
        const formatted = formatRequestInfoForDisplay(payload);
        if (formatted) {
          onDelta(formatted);
        }
      },
    });

    onDone();
  } catch (err: unknown) {
    onError(err instanceof Error ? err : new Error(String(err)));
    onDone();
  }
}
