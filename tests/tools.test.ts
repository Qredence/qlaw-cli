import { expect, test, describe } from "bun:test";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { parseToolCalls, executeToolCall } from "../src/tools";

describe("tools", () => {
  test("parseToolCalls extracts tool blocks", () => {
    const input = "```tool\n{\"tool\": \"read_file\", \"args\": {\"path\": \"README.md\"}}\n```";
    const calls = parseToolCalls(input);
    expect(calls.length).toBe(1);
    expect(calls[0]?.tool).toBe("read_file");
  });

  test("executeToolCall writes and reads files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "qlaw-tools-"));
    const writeResult = await executeToolCall(
      { tool: "write_file", args: { path: "note.txt", content: "hello" } },
      { cwd: dir, maxFileBytes: 10_000, maxDirEntries: 10, maxOutputChars: 10_000 }
    );
    expect(writeResult.ok).toBe(true);

    const readResult = await executeToolCall(
      { tool: "read_file", args: { path: "note.txt" } },
      { cwd: dir, maxFileBytes: 10_000, maxDirEntries: 10, maxOutputChars: 10_000 }
    );
    expect(readResult.ok).toBe(true);
    expect(readResult.output).toContain("hello");

    const raw = readFileSync(join(dir, "note.txt"), "utf-8");
    expect(raw).toBe("hello");
  });
});
