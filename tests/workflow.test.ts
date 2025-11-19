import { expect, test, describe } from "bun:test";
import { startWorkflow, continueWorkflow } from "../src/workflow";

function installFetchMock(fn: () => Promise<any>) {
  const original = globalThis.fetch;
  const mock = fn as unknown as typeof fetch;
  (mock as any).preconnect = async () => {};
  globalThis.fetch = mock;
  return () => {
    globalThis.fetch = original;
  };
}

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

function createMockResponse(chunks: string[]) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body: {
      getReader() {
        return createMockReader(chunks);
      },
    },
    text: async () => "",
  } as any;
}

describe("workflow service", () => {
  test("startWorkflow streams deltas and completes", async () => {
    const deltas: string[] = [];
    const calls: string[] = [];
    const restore = installFetchMock(async () => {
      calls.push("fetch:start");
      return createMockResponse([
        "event: response.output_text.delta\n",
        'data: {"delta": "Hello"}\n',
        "\n",
        "event: response.output_text.delta\n",
        'data: {"delta": " World"}\n',
        "\n",
      ]);
    });

    let done = false;
    await startWorkflow({
      baseUrl: "http://localhost:8000",
      model: "workflow",
      input: "Hi",
      onDelta: (t) => deltas.push(t),
      onError: () => {},
      onDone: () => { done = true; },
    });

    restore();

    expect(calls).toEqual(["fetch:start"]);
    expect(deltas.join("")).toBe("Hello World");
    expect(done).toBe(true);
  });

  test("continueWorkflow streams deltas and completes", async () => {
    const deltas: string[] = [];
    const restore = installFetchMock(async () => {
      return createMockResponse([
        "event: response.output_text.delta\n",
        'data: {"delta": "Follow"}\n',
        "\n",
      ]);
    });

    let done = false;
    await continueWorkflow({
      baseUrl: "http://localhost:8000",
      entityId: "E1",
      input: "continue",
      onDelta: (t) => deltas.push(t),
      onError: () => {},
      onDone: () => { done = true; },
    });

    restore();

    expect(deltas.join("")).toBe("Follow");
    expect(done).toBe(true);
  });
});
