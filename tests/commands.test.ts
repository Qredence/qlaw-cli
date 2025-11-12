import { expect, test, describe } from "bun:test";
import {
  getBuiltInCommandNames,
  getBuiltInDescription,
  BUILT_IN_COMMANDS,
  MENTIONS,
} from "../src/commands";

describe("commands", () => {
  describe("getBuiltInCommandNames", () => {
    test("should return array of command names", () => {
      const names = getBuiltInCommandNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });

    test("should return all command names from BUILT_IN_COMMANDS", () => {
      const names = getBuiltInCommandNames();
      expect(names.length).toBe(BUILT_IN_COMMANDS.length);
      BUILT_IN_COMMANDS.forEach((cmd) => {
        expect(names).toContain(cmd.name);
      });
    });

    test("should return string array", () => {
      const names = getBuiltInCommandNames();
      names.forEach((name) => {
        expect(typeof name).toBe("string");
      });
    });
  });

  describe("getBuiltInDescription", () => {
    test("should return description for valid command", () => {
      const description = getBuiltInDescription("help");
      expect(description).toBeDefined();
      expect(typeof description).toBe("string");
      expect(description).toBe("Show help");
    });

    test("should return description for clear command", () => {
      const description = getBuiltInDescription("clear");
      expect(description).toBe("Clear all messages");
    });

    test("should return description for model command", () => {
      const description = getBuiltInDescription("model");
      expect(description).toBe("Set the model name");
    });

    test("should return undefined for invalid command", () => {
      const description = getBuiltInDescription("nonexistent" as any);
      expect(description).toBeUndefined();
    });

    test("should return undefined for empty string", () => {
      const description = getBuiltInDescription("" as any);
      expect(description).toBeUndefined();
    });

    test("should handle all built-in commands", () => {
      BUILT_IN_COMMANDS.forEach((cmd) => {
        const description = getBuiltInDescription(cmd.name);
        expect(description).toBe(cmd.description);
      });
    });
  });

  describe("BUILT_IN_COMMANDS structure", () => {
    test("should have all required fields", () => {
      BUILT_IN_COMMANDS.forEach((cmd) => {
        expect(cmd).toHaveProperty("name");
        expect(cmd).toHaveProperty("description");
        expect(typeof cmd.name).toBe("string");
        expect(typeof cmd.description).toBe("string");
      });
    });

    test("should have unique command names", () => {
      const names = BUILT_IN_COMMANDS.map((c) => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("MENTIONS structure", () => {
    test("should have all required fields", () => {
      MENTIONS.forEach((mention) => {
        expect(mention).toHaveProperty("name");
        expect(mention).toHaveProperty("description");
        expect(typeof mention.name).toBe("string");
        expect(typeof mention.description).toBe("string");
      });
    });
  });
});

