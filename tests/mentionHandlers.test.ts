import { expect, test, describe } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { formatMessageWithMentionsAsync } from "../src/mentionHandlers";

describe("formatMessageWithMentionsAsync", () => {
  test("inlines @file contents from cwd", async () => {
    const dir = mkdtempSync(join(tmpdir(), "qlaw-mentions-"));
    const filePath = join(dir, "note.txt");
    writeFileSync(filePath, "hello world", "utf-8");

    const result = await formatMessageWithMentionsAsync("@file note.txt", {
      cwd: dir,
      maxFileBytes: 10_000,
    });

    expect(result).toContain("```txt");
    expect(result).toContain("hello world");
  });

  test("blocks @file reads outside cwd", async () => {
    const dir = mkdtempSync(join(tmpdir(), "qlaw-mentions-"));
    const result = await formatMessageWithMentionsAsync("@file ../secret.txt", {
      cwd: dir,
      maxFileBytes: 10_000,
    });
    expect(result).toContain("outside working directory");
  });
});
