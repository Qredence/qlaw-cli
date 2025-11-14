import { expect, test, describe } from "bun:test";
import { parseSSEStream, type SSEEventHandlers } from "../src/sse";

// Helper to create a mock reader from chunks
function createMockReader(chunks: string[]): {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
} {
  let index = 0;
  return {
    async read() {
      if (index >= chunks.length) {
        return { done: true };
      }
      const chunk = chunks[index++];
      return {
        done: false,
        value: new TextEncoder().encode(chunk),
      };
    },
  };
}

describe("parseSSEStream", () => {
  describe("delta events", () => {
    test("should parse response.output_text.delta events", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "Hello"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Hello"]);
    });

    test("should parse message.delta events", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: message.delta\n",
        'data: {"text": "World"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["World"]);
    });

    test("should parse response.delta events", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.delta\n",
        'data: {"content": "Test"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Test"]);
    });

    test("should parse delta from payload type field", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        'data: {"type": "response.output_text.delta", "delta": "Type delta"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Type delta"]);
    });

    test("should handle multiple delta events", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "Hello"}\n',
        "\n",
        "event: response.output_text.delta\n",
        'data: {"delta": " World"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Hello", " World"]);
    });
  });

  describe("error events", () => {
    test("should handle response.error events", async () => {
      const errors: Error[] = [];
      const handlers: SSEEventHandlers = {
        onError: (error) => errors.push(error),
      };

      const reader = createMockReader([
        "event: response.error\n",
        'data: {"error": {"message": "Test error"}}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(errors.length).toBe(1);
      expect(errors[0]?.message).toBe("Test error");
    });

    test("should handle error type from payload", async () => {
      const errors: Error[] = [];
      const handlers: SSEEventHandlers = {
        onError: (error) => errors.push(error),
      };

      const reader = createMockReader([
        'data: {"type": "error", "message": "Payload error"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(errors.length).toBe(1);
      expect(errors[0]?.message).toBe("Payload error");
    });

    test("should use fallback message for unknown error format", async () => {
      const errors: Error[] = [];
      const handlers: SSEEventHandlers = {
        onError: (error) => errors.push(error),
      };

      const reader = createMockReader([
        "event: response.error\n",
        'data: {"message": "Direct message"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(errors.length).toBe(1);
      expect(errors[0]?.message).toBe("Direct message");
    });
  });

  describe("trace.complete events", () => {
    test("should handle response.trace.complete events", async () => {
      const traces: any[] = [];
      const handlers: SSEEventHandlers = {
        onTraceComplete: (payload) => traces.push(payload),
      };

      const reader = createMockReader([
        "event: response.trace.complete\n",
        'data: {"trace_type": "workflow_info"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(traces.length).toBe(1);
      expect(traces[0]?.trace_type).toBe("workflow_info");
    });

    test("should handle trace.complete from payload type field", async () => {
      const traces: any[] = [];
      const handlers: SSEEventHandlers = {
        onTraceComplete: (payload) => traces.push(payload),
      };

      const reader = createMockReader([
        'data: {"type": "response.trace.complete", "data": {"trace_type": "workflow_info"}}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(traces.length).toBe(1);
      expect(traces[0]?.type).toBe("response.trace.complete");
    });
  });

  describe("[DONE] signal", () => {
    test("should handle [DONE] signal", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "Hello"}\n',
        "\n",
        "data: [DONE]\n",
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Hello"]);
    });
  });

  describe("buffer handling", () => {
    test("should handle partial lines in buffer", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      // Split a line across chunks
      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "Hello',
        ' World"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Hello World"]);
    });

    test("should handle multiple events in one chunk", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "First"}\n',
        "\n",
        "event: response.output_text.delta\n",
        'data: {"delta": "Second"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["First", "Second"]);
    });

    test("should handle CRLF line endings", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\r\n",
        'data: {"delta": "CRLF"}\r\n',
        "\r\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["CRLF"]);
    });
  });

  describe("error handling", () => {
    test("should ignore malformed JSON gracefully", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "Valid"}\n',
        "\n",
        "data: invalid json{not valid}\n",
        "\n",
        "event: response.output_text.delta\n",
        'data: {"delta": "After"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Valid", "After"]);
    });

    test("should handle empty data lines", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "data:\n",
        "\n",
        "event: response.output_text.delta\n",
        'data: {"delta": "After empty"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["After empty"]);
    });
  });

  describe("generic event handler", () => {
    test("should call onEvent for all events", async () => {
      const events: Array<{ type: string | null; payload: any }> = [];
      const handlers: SSEEventHandlers = {
        onEvent: (type, payload) => events.push({ type, payload }),
      };

      const reader = createMockReader([
        "event: custom.event\n",
        'data: {"custom": "data"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("response.completed event", () => {
    test("should reset current event on response.completed", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        "event: response.output_text.delta\n",
        'data: {"delta": "Before"}\n',
        "\n",
        "event: response.completed\n",
        "\n",
        "event: response.output_text.delta\n",
        'data: {"delta": "After"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      expect(deltas).toEqual(["Before", "After"]);
    });
  });

  describe("fallback text extraction", () => {
    test("should extract text from various payload formats", async () => {
      const deltas: string[] = [];
      const handlers: SSEEventHandlers = {
        onDelta: (text) => deltas.push(text),
      };

      const reader = createMockReader([
        'data: {"text": "From text"}\n',
        "\n",
        'data: {"content": "From content"}\n',
        "\n",
        'data: {"delta": "From delta"}\n',
        "\n",
      ]);

      await parseSSEStream(reader, handlers);
      // Should extract text from various fields
      expect(deltas.length).toBeGreaterThan(0);
    });
  });
});

