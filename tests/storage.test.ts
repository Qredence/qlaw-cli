import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import {
  loadSettings,
  saveSettings,
  loadSessions,
  saveSessions,
  loadCustomCommands,
  saveCustomCommands,
  defaultSettings,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_SESSIONS,
  STORAGE_KEY_COMMANDS,
} from "../src/storage";
import type { AppSettings, Session, CustomCommand } from "../src/types";

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

beforeEach(() => {
  // Clear mock storage before each test
  Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  
  // Override localStorage methods
  globalThis.localStorage = {
    getItem: (key: string) => mockLocalStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockLocalStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockLocalStorage[key];
    },
    clear: () => {
      Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    },
    get length() {
      return Object.keys(mockLocalStorage).length;
    },
    key: (index: number) => Object.keys(mockLocalStorage)[index] || null,
  } as Storage;
});

afterEach(() => {
  // Clean up
  Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
});

describe("storage", () => {
  describe("loadSettings", () => {
    test("should return default settings when localStorage is empty", () => {
      const settings = loadSettings();
      expect(settings).toBeDefined();
      expect(settings.theme).toBe(defaultSettings.theme);
      expect(settings.showTimestamps).toBe(defaultSettings.showTimestamps);
      expect(settings.autoScroll).toBe(defaultSettings.autoScroll);
    });

    test("should load saved settings correctly", () => {
      const savedSettings: AppSettings = {
        ...defaultSettings,
        theme: "light",
        showTimestamps: true,
        model: "gpt-4",
      };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(savedSettings));
      
      const loaded = loadSettings();
      expect(loaded.theme).toBe("light");
      expect(loaded.showTimestamps).toBe(true);
      expect(loaded.model).toBe("gpt-4");
    });

    test("should merge saved settings with defaults", () => {
      const partialSettings = { theme: "light" };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(partialSettings));
      
      const loaded = loadSettings();
      expect(loaded.theme).toBe("light");
      expect(loaded.showTimestamps).toBe(defaultSettings.showTimestamps);
      expect(loaded.autoScroll).toBe(defaultSettings.autoScroll);
    });

    test("should handle corrupted JSON gracefully", () => {
      localStorage.setItem(STORAGE_KEY_SETTINGS, "invalid json{");
      
      const settings = loadSettings();
      expect(settings).toBeDefined();
      expect(settings.theme).toBe(defaultSettings.theme);
    });

    test("should preserve keybindings from defaults if missing", () => {
      const settingsWithoutKeybindings = { theme: "light" };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settingsWithoutKeybindings));
      
      const loaded = loadSettings();
      expect(loaded.keybindings).toBeDefined();
      expect(loaded.keybindings).toEqual(defaultSettings.keybindings);
    });

    test("should set version to 1", () => {
      const loaded = loadSettings();
      expect(loaded.version).toBe(1);
    });
  });

  describe("saveSettings", () => {
    test("should save settings to localStorage", () => {
      const settings: AppSettings = {
        ...defaultSettings,
        theme: "light",
        model: "gpt-4",
      };
      
      saveSettings(settings);
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      expect(saved).toBeDefined();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.theme).toBe("light");
      expect(parsed.model).toBe("gpt-4");
    });

    test("should overwrite existing settings", () => {
      const firstSettings: AppSettings = { ...defaultSettings, theme: "dark" };
      saveSettings(firstSettings);
      
      const secondSettings: AppSettings = { ...defaultSettings, theme: "light" };
      saveSettings(secondSettings);
      
      const loaded = loadSettings();
      expect(loaded.theme).toBe("light");
    });
  });

  describe("loadSessions", () => {
    test("should return empty array when localStorage is empty", () => {
      const sessions = loadSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);
    });

    test("should load sessions correctly", () => {
      const testSessions: Session[] = [
        {
          id: "1",
          name: "Session 1",
          messages: [],
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          name: "Session 2",
          messages: [],
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ];
      
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(testSessions));
      const loaded = loadSessions();
      
      expect(loaded.length).toBe(2);
      expect(loaded[0]?.id).toBe("1");
      expect(loaded[1]?.id).toBe("2");
    });

    test("should parse dates correctly", () => {
      const testSessions: Session[] = [
        {
          id: "1",
          name: "Session 1",
          messages: [],
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
      ];
      
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(testSessions));
      const loaded = loadSessions();
      
      expect(loaded[0]?.createdAt).toBeInstanceOf(Date);
      expect(loaded[0]?.updatedAt).toBeInstanceOf(Date);
    });

    test("should handle corrupted JSON gracefully", () => {
      localStorage.setItem(STORAGE_KEY_SESSIONS, "invalid json{");
      
      const sessions = loadSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);
    });
  });

  describe("saveSessions", () => {
    test("should save sessions to localStorage", () => {
      const sessions: Session[] = [
        {
          id: "1",
          name: "Session 1",
          messages: [],
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];
      
      saveSessions(sessions);
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      expect(saved).toBeDefined();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.length).toBe(1);
      expect(parsed[0]?.id).toBe("1");
    });

    test("should overwrite existing sessions", () => {
      const firstSessions: Session[] = [
        {
          id: "1",
          name: "First",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      saveSessions(firstSessions);
      
      const secondSessions: Session[] = [
        {
          id: "2",
          name: "Second",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      saveSessions(secondSessions);
      
      const loaded = loadSessions();
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe("2");
    });
  });

  describe("loadCustomCommands", () => {
    test("should return empty array when localStorage is empty", () => {
      const commands = loadCustomCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });

    test("should load custom commands correctly", () => {
      const testCommands: CustomCommand[] = [
        {
          id: "1",
          name: "test",
          description: "Test command",
          command: "echo test",
        },
      ];
      
      localStorage.setItem(STORAGE_KEY_COMMANDS, JSON.stringify(testCommands));
      const loaded = loadCustomCommands();
      
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe("1");
      expect(loaded[0]?.name).toBe("test");
    });

    test("should handle corrupted JSON gracefully", () => {
      localStorage.setItem(STORAGE_KEY_COMMANDS, "invalid json{");
      
      const commands = loadCustomCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });
  });

  describe("saveCustomCommands", () => {
    test("should save custom commands to localStorage", () => {
      const commands: CustomCommand[] = [
        {
          id: "1",
          name: "test",
          description: "Test command",
          command: "echo test",
        },
      ];
      
      saveCustomCommands(commands);
      const saved = localStorage.getItem(STORAGE_KEY_COMMANDS);
      expect(saved).toBeDefined();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.length).toBe(1);
      expect(parsed[0]?.name).toBe("test");
    });

    test("should overwrite existing commands", () => {
      const firstCommands: CustomCommand[] = [
        { id: "1", name: "first", description: "First", command: "echo 1" },
      ];
      saveCustomCommands(firstCommands);
      
      const secondCommands: CustomCommand[] = [
        { id: "2", name: "second", description: "Second", command: "echo 2" },
      ];
      saveCustomCommands(secondCommands);
      
      const loaded = loadCustomCommands();
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe("2");
    });
  });
});

