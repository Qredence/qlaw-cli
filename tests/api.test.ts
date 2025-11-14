import { expect, test, describe } from "bun:test";
import { getAuthHeader, buildResponsesInput } from "../src/api";
import type { Message } from "../src/types";

describe("api", () => {
  describe("getAuthHeader", () => {
    test("should return Azure header for Azure URLs", () => {
      const header = getAuthHeader("https://example.openai.azure.com", "test-key");
      expect(header).toHaveProperty("api-key");
      expect(header["api-key"]).toBe("test-key");
      expect(header).not.toHaveProperty("Authorization");
    });

    test("should return Azure header for URLs containing /openai/", () => {
      const header = getAuthHeader("https://example.com/openai/v1", "test-key");
      expect(header).toHaveProperty("api-key");
      expect(header["api-key"]).toBe("test-key");
    });

    test("should return Bearer token for standard URLs", () => {
      const header = getAuthHeader("https://api.openai.com/v1", "test-key");
      expect(header).toHaveProperty("Authorization");
      expect(header.Authorization).toBe("Bearer test-key");
      expect(header).not.toHaveProperty("api-key");
    });

    test("should return Bearer token for non-Azure URLs", () => {
      const header = getAuthHeader("https://api.example.com", "test-key");
      expect(header).toHaveProperty("Authorization");
      expect(header.Authorization).toBe("Bearer test-key");
    });

    test("should handle undefined baseUrl", () => {
      const header = getAuthHeader(undefined, "test-key");
      expect(header).toHaveProperty("Authorization");
      expect(header.Authorization).toBe("Bearer test-key");
    });

    test("should handle empty string baseUrl", () => {
      const header = getAuthHeader("", "test-key");
      expect(header).toHaveProperty("Authorization");
      expect(header.Authorization).toBe("Bearer test-key");
    });

    test("should preserve API key value", () => {
      const key = "sk-1234567890abcdef";
      const header = getAuthHeader("https://api.openai.com", key);
      expect(header.Authorization).toBe(`Bearer ${key}`);
    });
  });

  describe("buildResponsesInput", () => {
    test("should build correct prompt format from messages", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Hello",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: "Hi there!",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt).toContain("User:");
      expect(prompt).toContain("Hello");
      expect(prompt).toContain("Assistant:");
      expect(prompt).toContain("Hi there!");
      expect(prompt).toContain("Assistant:");
    });

    test("should handle empty history", () => {
      const prompt = buildResponsesInput([]);
      expect(prompt).toBe("Assistant:");
    });

    test("should map user role correctly", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Test message",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt).toContain("User:");
      expect(prompt).toContain("Test message");
    });

    test("should map assistant role correctly", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "assistant",
          content: "Assistant message",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt).toContain("Assistant:");
      expect(prompt).toContain("Assistant message");
    });

    test("should map system role correctly", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "system",
          content: "System message",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt).toContain("System:");
      expect(prompt).toContain("System message");
    });

    test("should append Assistant: at the end", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Hello",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt.endsWith("Assistant:")).toBe(true);
    });

    test("should separate messages with blank lines", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "First",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "user",
          content: "Second",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      const parts = prompt.split("\n\n");
      expect(parts.length).toBeGreaterThan(2);
    });

    test("should handle multiple messages in sequence", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Message 1",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: "Response 1",
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "user",
          content: "Message 2",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt).toContain("Message 1");
      expect(prompt).toContain("Response 1");
      expect(prompt).toContain("Message 2");
      expect(prompt).toContain("Assistant:");
    });

    test("should preserve message content exactly", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Special chars: !@#$%^&*()",
          timestamp: new Date(),
        },
      ];

      const prompt = buildResponsesInput(messages);
      expect(prompt).toContain("Special chars: !@#$%^&*()");
    });
  });
});

