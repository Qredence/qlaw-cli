import { expect, test } from "bun:test";
import { defaultSettings } from "../src/storage";

test("streamResponseFromOpenAI returns error when env missing", async () => {
  delete (process.env as any).OPENAI_BASE_URL;
  delete (process.env as any).OPENAI_API_KEY;
  delete (process.env as any).OPENAI_MODEL;
  delete (process.env as any).LITELLM_BASE_URL;
  delete (process.env as any).LITELLM_API_KEY;
  delete (process.env as any).LITELLM_MODEL;
  delete (process.env as any).LLM_PROVIDER;
  const { streamResponseFromOpenAI } = await import("../src/services/streamingService");
  const history: any[] = [];
  const events: string[] = [];
  const settings = {
    ...defaultSettings,
    model: undefined,
    endpoint: undefined,
    apiKey: undefined,
    provider: undefined,
  };
  await streamResponseFromOpenAI({
    history: history as any,
    settings,
    callbacks: {
      onDelta: (t) => events.push(`delta:${t}`),
      onError: (e) => events.push(`error:${e.message}`),
      onDone: () => events.push("done"),
    },
  });
  // Expect onError and onDone, but no delta
  expect(events.some((e) => e.startsWith("error:"))).toBe(true);
  expect(events.includes("done")).toBe(true);
  expect(events.some((e) => e.startsWith("delta:"))).toBe(false);
});
