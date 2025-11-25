import { expect, test, describe } from "bun:test";
import { formatCliStatus } from "../../src/cliHelp";

describe("cli status", () => {
  test("includes key fields and redacted key", () => {
    const s = formatCliStatus({
      theme: "dark",
      autoScroll: true,
      model: "gpt-4o",
      endpoint: "https://api.openai.com",
      apiKey: "sk-live-abcdef1234",
      afBridgeBaseUrl: "http://127.0.0.1:8081",
      afModel: "multi_tier_support",
      workflow: { enabled: true },
    });
    expect(s).toContain("Theme: dark");
    expect(s).toContain("Auto-scroll: Enabled");
    expect(s).toContain("Model: gpt-4o");
    expect(s).toContain("Endpoint: https://api.openai.com");
    expect(s).toContain("API Key: ****1234");
    expect(s).toContain("AF Bridge: http://127.0.0.1:8081");
    expect(s).toContain("AF Model: multi_tier_support");
    expect(s).toContain("Workflow Mode: Enabled");
  });
});
