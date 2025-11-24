import { expect, test, describe } from "bun:test";
import { computeLineCount } from "../src/components/AdaptiveTextInput";

describe("AdaptiveTextInput", () => {
  test("computeLineCount: single short line stays 1", () => {
    const n = computeLineCount("hello", 80);
    expect(n).toBe(1);
  });

  test("computeLineCount: wraps long line by columns", () => {
    const n = computeLineCount("a".repeat(100), 20);
    expect(n).toBe(5);
  });

  test("computeLineCount: explicit newlines counted", () => {
    const n = computeLineCount("one\n two\n three", 80);
    expect(n).toBe(3);
  });

  test("computeLineCount: mixed long words and newlines", () => {
    const n = computeLineCount("word".repeat(50) + "\nend", 10);
    expect(n).toBeGreaterThan(10);
  });

  test("computeLineCount: min is 1", () => {
    const n = computeLineCount("", 10);
    expect(n).toBe(1);
  });
});

