/**
 * SSE (Server-Sent Events) parsing utilities
 * Consolidates duplicate SSE parsing logic from streaming functions
 */

export interface SSEEventHandlers {
  /**
   * Called when a delta/text chunk is received
   */
  onDelta?: (text: string) => void;
  /**
   * Called when an error event is received
   */
  onError?: (error: Error) => void;
  /**
   * Called when a trace.complete event is received (e.g., RequestInfoEvent)
   */
  onTraceComplete?: (payload: any) => void;
  /**
   * Called when any other event is received
   */
  onEvent?: (eventType: string | null, payload: any) => void;
}

/**
 * Parse SSE stream from a ReadableStream reader
 * Handles buffer management, event/data line parsing, and delegates to handlers
 */
export async function parseSSEStream(
  reader: { read(): Promise<{ done: boolean; value?: Uint8Array }> },
  handlers: SSEEventHandlers
): Promise<void> {
  const decoder = new TextDecoder();
  let buf = "";
  let currentEvent: string | null = null;

  // SSE parsing: events separated by blank lines; each event has optional "event:" and one or more "data:" lines
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Split by lines and process whenever we hit a blank line
    const parts = buf.split(/\r?\n/);
    // Keep the last partial line in buffer
    buf = parts.pop() || "";

    for (const line of parts) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr === "[DONE]") {
          currentEvent = null;
          continue;
        }
        try {
          const payload = jsonStr ? JSON.parse(jsonStr) : null;
          
          // Handle trace.complete events (e.g., RequestInfoEvent)
          if (currentEvent === "response.trace.complete" && handlers.onTraceComplete) {
            try {
              handlers.onTraceComplete(payload);
            } catch (e: any) {
              console.error("Error in onTraceComplete handler:", e);
            }
          }
          // Handle trace.complete from payload type field
          else if (payload?.type === "response.trace.complete" && handlers.onTraceComplete) {
            try {
              handlers.onTraceComplete(payload);
            } catch (e: any) {
              console.error("Error in onTraceComplete handler:", e);
            }
          }
          // Handle error events
          else if (currentEvent === "response.error" && handlers.onError) {
            const msg =
              payload?.error?.message || payload?.message || "Unknown error";
            try {
              handlers.onError(new Error(msg));
            } catch (e: any) {
              console.error("Error in onError handler:", e);
            }
          }
          // Handle delta/text events
          else if (
            (currentEvent === "response.output_text.delta" ||
              currentEvent === "message.delta" ||
              currentEvent === "response.delta") &&
            handlers.onDelta
          ) {
            const delta =
              payload?.delta ??
              payload?.text ??
              payload?.content ??
              payload?.output_text?.delta ??
              "";
            if (delta) {
              try {
                handlers.onDelta(delta);
              } catch (e: any) {
                console.error("Error in onDelta handler:", e);
              }
            }
          }
          // Handle completion signal
          else if (currentEvent === "response.completed") {
            currentEvent = null;
          }
          // Handle generic error type
          else if (payload?.type === "error" && handlers.onError) {
            try {
              handlers.onError(new Error(payload.message || "Unknown error"));
            } catch (e: any) {
              console.error("Error in onError handler:", e);
            }
          }
          // Handle response.output_text.delta from type field
          else if (
            payload?.type === "response.output_text.delta" &&
            typeof payload.delta === "string" &&
            handlers.onDelta
          ) {
            try {
              handlers.onDelta(payload.delta);
            } catch (e: any) {
              console.error("Error in onDelta handler:", e);
            }
          }
          // Fallback: if we see any payload with text, append
          else if (payload && typeof payload === "object" && handlers.onDelta) {
            const fallback =
              payload?.delta ?? payload?.text ?? payload?.content;
            if (typeof fallback === "string" && fallback) {
              try {
                handlers.onDelta(fallback);
              } catch (e: any) {
                console.error("Error in onDelta handler:", e);
              }
            }
          }
          // Generic event handler
          if (handlers.onEvent) {
            try {
              handlers.onEvent(currentEvent, payload);
            } catch (e: any) {
              console.error("Error in onEvent handler:", e);
            }
          }
        } catch (e: any) {
          // Ignore parse errors for keep-alive/comment lines
        }
      } else if (line.trim() === "") {
        // End of event
        currentEvent = null;
      }
    }
  }

  // Process any remaining data in buffer after stream ends
  if (buf.trim()) {
    // Split by lines and process all remaining lines
    const parts = buf.split(/\r?\n/);
    for (const line of parts) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr === "[DONE]") {
          currentEvent = null;
          continue;
        }
        try {
          const payload = jsonStr ? JSON.parse(jsonStr) : null;
          
          // Handle trace.complete events (e.g., RequestInfoEvent)
          if (currentEvent === "response.trace.complete" && handlers.onTraceComplete) {
            try {
              handlers.onTraceComplete(payload);
            } catch (e: any) {
              console.error("Error in onTraceComplete handler:", e);
            }
          }
          // Handle trace.complete from payload type field
          else if (payload?.type === "response.trace.complete" && handlers.onTraceComplete) {
            try {
              handlers.onTraceComplete(payload);
            } catch (e: any) {
              console.error("Error in onTraceComplete handler:", e);
            }
          }
          // Handle error events
          else if (currentEvent === "response.error" && handlers.onError) {
            const msg =
              payload?.error?.message || payload?.message || "Unknown error";
            try {
              handlers.onError(new Error(msg));
            } catch (e: any) {
              console.error("Error in onError handler:", e);
            }
          }
          // Handle delta/text events
          else if (
            (currentEvent === "response.output_text.delta" ||
              currentEvent === "message.delta" ||
              currentEvent === "response.delta") &&
            handlers.onDelta
          ) {
            const delta =
              payload?.delta ??
              payload?.text ??
              payload?.content ??
              payload?.output_text?.delta ??
              "";
            if (delta) {
              try {
                handlers.onDelta(delta);
              } catch (e: any) {
                console.error("Error in onDelta handler:", e);
              }
            }
          }
          // Handle completion signal
          else if (currentEvent === "response.completed") {
            currentEvent = null;
          }
          // Handle generic error type
          else if (payload?.type === "error" && handlers.onError) {
            try {
              handlers.onError(new Error(payload.message || "Unknown error"));
            } catch (e: any) {
              console.error("Error in onError handler:", e);
            }
          }
          // Handle response.output_text.delta from type field
          else if (
            payload?.type === "response.output_text.delta" &&
            typeof payload.delta === "string" &&
            handlers.onDelta
          ) {
            try {
              handlers.onDelta(payload.delta);
            } catch (e: any) {
              console.error("Error in onDelta handler:", e);
            }
          }
          // Fallback: if we see any payload with text, append
          else if (payload && typeof payload === "object" && handlers.onDelta) {
            const fallback =
              payload?.delta ?? payload?.text ?? payload?.content;
            if (typeof fallback === "string" && fallback) {
              try {
                handlers.onDelta(fallback);
              } catch (e: any) {
                console.error("Error in onDelta handler:", e);
              }
            }
          }
          // Generic event handler
          if (handlers.onEvent) {
            try {
              handlers.onEvent(currentEvent, payload);
            } catch (e: any) {
              console.error("Error in onEvent handler:", e);
            }
          }
        } catch (e: any) {
          // Ignore parse errors for keep-alive/comment lines
        }
      } else if (line.trim() === "") {
        // End of event
        currentEvent = null;
      }
    }
  }
}

