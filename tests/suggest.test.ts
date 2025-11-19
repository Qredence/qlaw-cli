import { expect, test, describe } from "bun:test";
import { fuzzyMatch, type FuzzyItem } from "../src/suggest";

describe("fuzzyMatch", () => {
  const testItems: FuzzyItem[] = [
    { key: "help", description: "Show help", keywords: ["docs", "commands"] },
    { key: "clear", description: "Clear messages", keywords: ["reset", "cls"] },
    { key: "settings", description: "Configure settings", keywords: ["prefs"] },
    { key: "model", description: "Set model", keywords: ["ai", "llm"] },
    { key: "theme", description: "Toggle theme", keywords: ["dark", "light"] },
  ];

  describe("empty query", () => {
    test("should return first N items with score 0", () => {
      const results = fuzzyMatch("", testItems, 3);
      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.score).toBe(0);
      });
      expect(results[0]?.key).toBe("help");
      expect(results[1]?.key).toBe("clear");
      expect(results[2]?.key).toBe("settings");
    });

    test("should respect limit parameter", () => {
      const results = fuzzyMatch("", testItems, 2);
      expect(results.length).toBe(2);
    });

    test("should return all items if limit exceeds array length", () => {
      const results = fuzzyMatch("", testItems, 100);
      expect(results.length).toBe(testItems.length);
    });
  });

  describe("prefix matching", () => {
    test("should give highest score to prefix matches", () => {
      const results = fuzzyMatch("hel", testItems);
      expect(results[0]?.key).toBe("help");
      expect(results[0]?.score).toBeGreaterThan(100);
    });

    test("should prioritize exact prefix matches", () => {
      const results = fuzzyMatch("clear", testItems);
      expect(results[0]?.key).toBe("clear");
      expect(results[0]?.score).toBeGreaterThan(100);
    });
  });

  describe("subsequence matching", () => {
    test("should match in-order subsequences", () => {
      const results = fuzzyMatch("st", testItems);
      expect(results.length).toBeGreaterThan(0);
      const settingsMatch = results.find((r) => r.key === "settings");
      expect(settingsMatch).toBeDefined();
      expect(settingsMatch?.score).toBeGreaterThan(0);
    });

    test("should score closer characters higher", () => {
      const results = fuzzyMatch("he", testItems);
      const helpMatch = results.find((r) => r.key === "help");
      expect(helpMatch).toBeDefined();
      expect(helpMatch?.score).toBeGreaterThan(0);
    });

    test("should not match out-of-order sequences", () => {
      const results = fuzzyMatch("eh", testItems);
      const helpMatch = results.find((r) => r.key === "help");
      if (helpMatch) {
        // If it matches, it should be through keyword matching, not subsequence
        expect(helpMatch.score).toBeLessThan(100);
      }
    });
  });

  describe("keyword matching", () => {
    test("should boost score for exact keyword match", () => {
      const results = fuzzyMatch("docs", testItems);
      const helpMatch = results.find((r) => r.key === "help");
      expect(helpMatch).toBeDefined();
      expect(helpMatch?.score).toBeGreaterThanOrEqual(30);
    });

    test("should boost score for keyword prefix match", () => {
      const results = fuzzyMatch("doc", testItems);
      const helpMatch = results.find((r) => r.key === "help");
      expect(helpMatch).toBeDefined();
      expect(helpMatch?.score).toBeGreaterThanOrEqual(15);
    });

    test("should boost score for keyword contains match", () => {
      const results = fuzzyMatch("oc", testItems);
      const helpMatch = results.find((r) => r.key === "help");
      if (helpMatch) {
        expect(helpMatch.score).toBeGreaterThan(0);
      }
    });
  });

  describe("case insensitivity", () => {
    test("should match regardless of case", () => {
      const upperResults = fuzzyMatch("HELP", testItems);
      const lowerResults = fuzzyMatch("help", testItems);
      expect(upperResults[0]?.key).toBe("help");
      expect(lowerResults[0]?.key).toBe("help");
      const upperScore = upperResults[0]?.score ?? 0;
      const lowerScore = lowerResults[0]?.score ?? 0;
      expect(upperScore).toBe(lowerScore);
    });

    test("should handle mixed case", () => {
      const results = fuzzyMatch("HeLp", testItems);
      expect(results[0]?.key).toBe("help");
      expect(results[0]?.score).toBeGreaterThan(0);
    });
  });

  describe("sorting", () => {
    test("should sort by score descending", () => {
      const results = fuzzyMatch("e", testItems);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]?.score).toBeGreaterThanOrEqual(results[i + 1]?.score || 0);
      }
    });

    test("should sort alphabetically when scores are equal", () => {
      // Empty query returns items in original order without sorting
      // So we need to test with a query that produces equal scores
      // Use items that will have equal scores when queried with "e"
      const equalScoreItems: FuzzyItem[] = [
        { key: "zebra", description: "Z" },
        { key: "alpha", description: "A" },
        { key: "beta", description: "B" },
      ];
      // Query "e" matches all items as subsequence with similar scores
      const results = fuzzyMatch("e", equalScoreItems, 10);
      
      // Group results by score to find items with equal scores
      const scoreGroups = new Map<number, Array<{ key: string }>>();
      results.forEach((r) => {
        if (!scoreGroups.has(r.score)) {
          scoreGroups.set(r.score, []);
        }
        scoreGroups.get(r.score)!.push({ key: r.key });
      });
      
      // For items with equal scores, verify they're sorted alphabetically
      scoreGroups.forEach((items, score) => {
        if (items.length > 1) {
          // Extract keys and verify they're in alphabetical order
          const keys = items.map((i) => i.key);
          for (let i = 0; i < keys.length - 1; i++) {
            const comparison = keys[i]!.localeCompare(keys[i + 1]!);
            expect(comparison).toBeLessThanOrEqual(0);
          }
        }
      });
    });
  });

  describe("limit parameter", () => {
    test("should respect limit", () => {
      const results = fuzzyMatch("e", testItems, 2);
      expect(results.length).toBe(2);
    });

    test("should return all matches if limit is high", () => {
      const results = fuzzyMatch("e", testItems, 100);
      expect(results.length).toBeLessThanOrEqual(testItems.length);
    });
  });

  describe("edge cases", () => {
    test("should handle empty items array", () => {
      const results = fuzzyMatch("test", [], 10);
      expect(results.length).toBe(0);
    });

    test("should handle items without keywords", () => {
      const items: FuzzyItem[] = [{ key: "test", description: "Test" }];
      const results = fuzzyMatch("te", items);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.key).toBe("test");
    });

    test("should handle whitespace in query", () => {
      const results = fuzzyMatch("  help  ", testItems);
      expect(results[0]?.key).toBe("help");
    });

    test("should not match items that don't contain query", () => {
      const results = fuzzyMatch("xyz", testItems);
      results.forEach((result) => {
        expect(result.score).toBe(0);
      });
    });

    test("should handle special characters", () => {
      const items: FuzzyItem[] = [{ key: "test-command", description: "Test" }];
      const results = fuzzyMatch("test", items);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("scoring logic", () => {
    test("should give prefix match highest score", () => {
      const results = fuzzyMatch("hel", testItems);
      const prefixScore = results.find((r) => r.key === "help")?.score || 0;
      const otherScores = results.filter((r) => r.key !== "help").map((r) => r.score);
      otherScores.forEach((score) => {
        expect(prefixScore).toBeGreaterThanOrEqual(score);
      });
    });

    test("should combine multiple scoring factors", () => {
      // "help" has keyword "commands", so "com" should match both prefix of keyword and subsequence
      const results = fuzzyMatch("com", testItems);
      const helpMatch = results.find((r) => r.key === "help");
      expect(helpMatch).toBeDefined();
      expect(helpMatch?.score).toBeGreaterThan(0);
    });
  });
});
