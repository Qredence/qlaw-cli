import { expect, test, describe } from "bun:test";
import { parseModelList } from "../src/llm/models";

describe("parseModelList", () => {
  test("returns empty array for undefined or empty", () => {
    expect(parseModelList(undefined)).toEqual([]);
    expect(parseModelList("")).toEqual([]);
    expect(parseModelList("   ")).toEqual([]);
  });

  test("parses comma-separated lists", () => {
    const models = parseModelList("openai/gpt-4o-mini, openai/gpt-4o");
    expect(models).toEqual(["openai/gpt-4o-mini", "openai/gpt-4o"]);
  });

  test("parses newline-separated lists", () => {
    const models = parseModelList("openai/gpt-4o-mini\nopenai/gpt-4o");
    expect(models).toEqual(["openai/gpt-4o-mini", "openai/gpt-4o"]);
  });

  test("parses JSON array of strings", () => {
    const models = parseModelList('["openai/gpt-4o-mini", "openai/gpt-4o"]');
    expect(models).toEqual(["openai/gpt-4o-mini", "openai/gpt-4o"]);
  });

  test("parses JSON array of objects with id", () => {
    const models = parseModelList('[{"id": "openai/gpt-4o-mini"}, {"id": "openai/gpt-4o"}]');
    expect(models).toEqual(["openai/gpt-4o-mini", "openai/gpt-4o"]);
  });
});
