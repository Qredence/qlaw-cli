import { expect, test, describe } from "bun:test";
import { parseRequestInfoEvent, formatRequestInfoForDisplay } from "../src/af";
import type { PendingRequest } from "../src/af";

test("parseRequestInfoEvent returns null for non-workflow_info", () => {
  const payload = { type: "response.trace.complete", data: { trace_type: "other" } };
  expect(parseRequestInfoEvent(payload)).toBeNull();
});

test("parseRequestInfoEvent extracts pending request from DevUI-shaped event", () => {
  const payload = {
    type: "response.trace.complete",
    data: {
      trace_type: "workflow_info",
      event_type: "RequestInfoEvent",
      data: {
        request_info: {
          request_id: "req_123",
          source_executor_id: "handoff-user-input",
          request_type: "HandoffUserInputRequest",
          response_type: "object",
          data: {
            prompt: "Provide your next input",
            conversation: [
              { role: "user", author_name: null, text: "Hello" },
              { role: "assistant", author_name: "triage_agent", text: "How can I help?" },
            ],
          },
        },
      },
    },
  };

  const pr = parseRequestInfoEvent(payload) as PendingRequest | null;
  expect(pr).not.toBeNull();
  expect(pr!.requestId).toBe("req_123");
  expect(pr!.prompt).toContain("Provide your next input");
  const conv = pr!.conversation;
  expect(Array.isArray(conv)).toBe(true);
  expect(conv.length).toBe(2);
  expect(conv[0]?.role).toBe("user");
  expect(conv[1]?.author_name).toBe("triage_agent");
});

describe("formatRequestInfoForDisplay", () => {
  test("should return null for invalid payloads", () => {
    expect(formatRequestInfoForDisplay(null)).toBeNull();
    expect(formatRequestInfoForDisplay({})).toBeNull();
    expect(formatRequestInfoForDisplay({ type: "other" })).toBeNull();
  });

  test("should return null for non-workflow_info trace type", () => {
    const payload = {
      data: {
        trace_type: "other",
        event_type: "RequestInfoEvent",
      },
    };
    expect(formatRequestInfoForDisplay(payload)).toBeNull();
  });

  test("should return null for non-RequestInfoEvent", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "OtherEvent",
      },
    };
    expect(formatRequestInfoForDisplay(payload)).toBeNull();
  });

  test("should format display text with prompt", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "Please provide your input",
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    expect(result).toContain("Please provide your input");
    expect(result).toStartWith("\n\n");
  });

  test("should include conversation history in display", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "Continue conversation",
              conversation: [
                { role: "user", author_name: null, text: "Hello" },
                { role: "assistant", author_name: "agent", text: "Hi!" },
              ],
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    expect(result).toContain("Continue conversation");
    expect(result).toContain("Recent messages:");
    expect(result).toContain("Hello");
    expect(result).toContain("Hi!");
  });

  test("should limit conversation history to last 5 messages", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "Test",
              conversation: Array.from({ length: 10 }, (_, i) => ({
                role: "user",
                text: `Message ${i}`,
              })),
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    // Should only show last 5 messages
    expect(result).toContain("Message 5");
    expect(result).toContain("Message 9");
    expect(result).not.toContain("Message 0");
    expect(result).not.toContain("Message 4");
  });

  test("should handle missing fields gracefully", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "Test prompt",
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    expect(result).toStartWith("\n\n");
    expect(result).toContain("Test prompt");
  });

  test("should handle empty prompt", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "",
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).toBeNull();
  });

  test("should format author_name when present", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "Test",
              conversation: [
                { role: "assistant", author_name: "specialist_agent", text: "Response" },
              ],
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    expect(result).toContain("specialist_agent");
  });

  test("should use role when author_name is null", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
        data: {
          request_info: {
            request_id: "req_123",
            data: {
              prompt: "Test",
              conversation: [
                { role: "user", author_name: null, text: "User message" },
              ],
            },
          },
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    expect(result).toContain("user");
    expect(result).toContain("User message");
  });

  test("should handle request_info at top level", () => {
    const payload = {
      data: {
        trace_type: "workflow_info",
        event_type: "RequestInfoEvent",
      },
      request_info: {
        request_id: "req_123",
        data: {
          prompt: "Top level prompt",
        },
      },
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).not.toBeNull();
    expect(result).toContain("Top level prompt");
  });

  test("should handle parse errors gracefully", () => {
    // Invalid structure that might cause errors
    const payload = {
      data: null,
    };

    const result = formatRequestInfoForDisplay(payload);
    expect(result).toBeNull();
  });
});
