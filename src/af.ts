export type PendingRequest = {
  requestId: string;
  sourceExecutorId: string;
  prompt: string;
  conversation: { role: string; author_name?: string | null; text: string }[];
};

export function parseRequestInfoEvent(payload: any): PendingRequest | null {
  try {
    const data = payload?.data;
    if (data?.trace_type !== "workflow_info" || data?.event_type !== "RequestInfoEvent") return null;
    const ri = data?.data?.request_info || payload?.request_info;
    if (!ri?.request_id) return null;
    
    const conversation = Array.isArray(ri.data?.conversation) 
      ? ri.data.conversation.filter((m: any) => 
          typeof m === 'object' && m !== null && 
          typeof m.role === 'string' && 
          typeof m.text === 'string'
        )
      : [];
    
    return {
      requestId: ri.request_id,
      sourceExecutorId: ri.source_executor_id || "",
      prompt: ri.data?.prompt || "",
      conversation,
    };
  } catch {
    return null;
  }
}

/**
 * Format RequestInfoEvent data as a readable inline message for display.
 * Consolidates duplicate formatting logic from streaming functions.
 */
export function formatRequestInfoForDisplay(payload: any): string | null {
  try {
    const data = payload?.data;
    if (
      data?.trace_type === "workflow_info" &&
      data?.event_type === "RequestInfoEvent"
    ) {
      const ri = data?.data?.request_info || payload?.request_info;
      if (ri?.request_id) {
        const prompt = ri.data?.prompt || "";
        const conversation = Array.isArray(ri.data?.conversation) ? ri.data.conversation : [];
        let inlineText = prompt;
        if (conversation.length > 0) {
          inlineText += "\n\nRecent messages:";
          conversation.slice(-5).forEach((m: any) => {
            inlineText += `\n- ${m.author_name || m.role}: ${m.text}`;
          });
        }
        return inlineText ? "\n\n" + inlineText : null;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}
