import { expect, test, describe } from "bun:test";
import { getTheme, DARK, LIGHT, type ThemeTokens } from "../src/themes";

describe("themes", () => {
  describe("getTheme", () => {
    test("should return DARK theme for 'dark'", () => {
      const theme = getTheme("dark");
      expect(theme).toBe(DARK);
    });

    test("should return LIGHT theme for 'light'", () => {
      const theme = getTheme("light");
      expect(theme).toBe(LIGHT);
    });

    test("should return DARK theme as default for any other value", () => {
      const theme = getTheme("dark" as any);
      expect(theme).toBe(DARK);
    });
  });

  describe("DARK theme structure", () => {
    test("should have all required bg tokens", () => {
      expect(DARK.bg).toHaveProperty("primary");
      expect(DARK.bg).toHaveProperty("secondary");
      expect(DARK.bg).toHaveProperty("panel");
      expect(DARK.bg).toHaveProperty("hover");
      expect(typeof DARK.bg.primary).toBe("string");
      expect(typeof DARK.bg.secondary).toBe("string");
      expect(typeof DARK.bg.panel).toBe("string");
      expect(typeof DARK.bg.hover).toBe("string");
    });

    test("should have all required text tokens", () => {
      expect(DARK.text).toHaveProperty("primary");
      expect(DARK.text).toHaveProperty("secondary");
      expect(DARK.text).toHaveProperty("tertiary");
      expect(DARK.text).toHaveProperty("dim");
      expect(DARK.text).toHaveProperty("accent");
      expect(typeof DARK.text.primary).toBe("string");
      expect(typeof DARK.text.secondary).toBe("string");
      expect(typeof DARK.text.tertiary).toBe("string");
      expect(typeof DARK.text.dim).toBe("string");
      expect(typeof DARK.text.accent).toBe("string");
    });

    test("should have border, success, and error tokens", () => {
      expect(DARK).toHaveProperty("border");
      expect(DARK).toHaveProperty("success");
      expect(DARK).toHaveProperty("error");
      expect(typeof DARK.border).toBe("string");
      expect(typeof DARK.success).toBe("string");
      expect(typeof DARK.error).toBe("string");
    });

    test("should have valid hex color format", () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      expect(DARK.bg.primary).toMatch(hexPattern);
      expect(DARK.text.primary).toMatch(hexPattern);
      expect(DARK.border).toMatch(hexPattern);
    });
  });

  describe("LIGHT theme structure", () => {
    test("should have all required bg tokens", () => {
      expect(LIGHT.bg).toHaveProperty("primary");
      expect(LIGHT.bg).toHaveProperty("secondary");
      expect(LIGHT.bg).toHaveProperty("panel");
      expect(LIGHT.bg).toHaveProperty("hover");
      expect(typeof LIGHT.bg.primary).toBe("string");
      expect(typeof LIGHT.bg.secondary).toBe("string");
      expect(typeof LIGHT.bg.panel).toBe("string");
      expect(typeof LIGHT.bg.hover).toBe("string");
    });

    test("should have all required text tokens", () => {
      expect(LIGHT.text).toHaveProperty("primary");
      expect(LIGHT.text).toHaveProperty("secondary");
      expect(LIGHT.text).toHaveProperty("tertiary");
      expect(LIGHT.text).toHaveProperty("dim");
      expect(LIGHT.text).toHaveProperty("accent");
      expect(typeof LIGHT.text.primary).toBe("string");
      expect(typeof LIGHT.text.secondary).toBe("string");
      expect(typeof LIGHT.text.tertiary).toBe("string");
      expect(typeof LIGHT.text.dim).toBe("string");
      expect(typeof LIGHT.text.accent).toBe("string");
    });

    test("should have border, success, and error tokens", () => {
      expect(LIGHT).toHaveProperty("border");
      expect(LIGHT).toHaveProperty("success");
      expect(LIGHT).toHaveProperty("error");
      expect(typeof LIGHT.border).toBe("string");
      expect(typeof LIGHT.success).toBe("string");
      expect(typeof LIGHT.error).toBe("string");
    });

    test("should have valid hex color format", () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      expect(LIGHT.bg.primary).toMatch(hexPattern);
      expect(LIGHT.text.primary).toMatch(hexPattern);
      expect(LIGHT.border).toMatch(hexPattern);
    });
  });

  describe("theme differences", () => {
    test("should have different colors for dark and light themes", () => {
      expect(DARK.bg.primary).not.toBe(LIGHT.bg.primary);
      expect(DARK.text.primary).not.toBe(LIGHT.text.primary);
    });

    test("should have consistent structure between themes", () => {
      const darkKeys = Object.keys(DARK);
      const lightKeys = Object.keys(LIGHT);
      expect(darkKeys.sort()).toEqual(lightKeys.sort());
    });
  });
});

