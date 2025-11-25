import { expect, test, describe } from "bun:test";
import { getCliUsage } from "../../src/cliHelp";

describe("cli help", () => {
  test("usage contains options", () => {
    const u = getCliUsage();
    expect(u).toContain("Usage: qlaw");
    expect(u).toContain("--help");
    expect(u).toContain("--version");
    expect(u).toContain("--status");
  });
});
