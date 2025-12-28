import { expect, test, describe } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { isExternalPath } from "../src/tools/permissions";

describe("isExternalPath", () => {
  test("returns false for paths inside cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "qlaw-tools-"));
    expect(isExternalPath("./notes.txt", dir)).toBe(false);
    expect(isExternalPath("notes.txt", dir)).toBe(false);
  });

  test("returns true for paths outside cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "qlaw-tools-"));
    expect(isExternalPath("../secret.txt", dir)).toBe(true);
  });
});
