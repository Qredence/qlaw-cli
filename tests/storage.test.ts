import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
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

let dataDir: string;
const tmpPrefix = join(tmpdir(), "qlaw-storage-");

const filePathFor = (key: string) => join(process.env.QLAW_DATA_DIR!, `${key}.json`);
const writeJson = (key: string, payload: unknown) => {
  writeFileSync(filePathFor(key), JSON.stringify(payload));
};
const readJson = (key: string) => JSON.parse(readFileSync(filePathFor(key), "utf-8"));

beforeEach(() => {
  dataDir = mkdtempSync(tmpPrefix);
  process.env.QLAW_DATA_DIR = dataDir;
});

afterEach(() => {
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
  }
  delete process.env.QLAW_DATA_DIR;
});

describe("storage", () => {
  describe("loadSettings", () => {
    test("should return default settings when no file exists", () => {
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
      writeJson(STORAGE_KEY_SETTINGS, savedSettings);

      const loaded = loadSettings();
      expect(loaded.theme).toBe("light");
      expect(loaded.showTimestamps).toBe(true);
      expect(loaded.model).toBe("gpt-4");
    });

    test("should merge saved settings with defaults", () => {
      const partialSettings = { theme: "light" };
      writeJson(STORAGE_KEY_SETTINGS, partialSettings);

      const loaded = loadSettings();
      expect(loaded.theme).toBe("light");
      expect(loaded.showTimestamps).toBe(defaultSettings.showTimestamps);
      expect(loaded.autoScroll).toBe(defaultSettings.autoScroll);
    });

    test("should handle corrupted JSON gracefully", () => {
      writeFileSync(filePathFor(STORAGE_KEY_SETTINGS), "invalid json{");

      const settings = loadSettings();
      expect(settings.theme).toBe(defaultSettings.theme);
    });

    test("should preserve keybindings from defaults if missing", () => {
      const settingsWithoutKeybindings = { theme: "light" };
      writeJson(STORAGE_KEY_SETTINGS, settingsWithoutKeybindings);

      const loaded = loadSettings();
      expect(loaded.keybindings).toEqual(defaultSettings.keybindings);
    });

    test("should set version to 1", () => {
      const loaded = loadSettings();
      expect(loaded.version).toBe(1);
    });
  });

  describe("saveSettings", () => {
    test("should save settings to disk", async () => {
      const settings: AppSettings = {
        ...defaultSettings,
        theme: "light",
        model: "gpt-4",
      };

      await saveSettings(settings);
      const parsed = readJson(STORAGE_KEY_SETTINGS);
      expect(parsed.theme).toBe("light");
      expect(parsed.model).toBe("gpt-4");
    });

    test("should overwrite existing settings", async () => {
      const firstSettings: AppSettings = { ...defaultSettings, theme: "dark" };
      await saveSettings(firstSettings);

      const secondSettings: AppSettings = { ...defaultSettings, theme: "light" };
      await saveSettings(secondSettings);

      const parsed = readJson(STORAGE_KEY_SETTINGS);
      expect(parsed.theme).toBe("light");
    });
  });

  describe("loadSessions", () => {
    test("should return empty array when no file exists", () => {
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

      writeJson(STORAGE_KEY_SESSIONS, testSessions);
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

      writeJson(STORAGE_KEY_SESSIONS, testSessions);
      const loaded = loadSessions();

      expect(loaded[0]?.createdAt).toBeInstanceOf(Date);
      expect(loaded[0]?.updatedAt).toBeInstanceOf(Date);
    });

    test("should handle corrupted JSON gracefully", () => {
      writeFileSync(filePathFor(STORAGE_KEY_SESSIONS), "invalid json{");

      const sessions = loadSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);
    });
  });

  describe("saveSessions", () => {
    test("should save sessions to disk", async () => {
      const sessions: Session[] = [
        {
          id: "1",
          name: "Session 1",
          messages: [],
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      await saveSessions(sessions);
      const parsed = readJson(STORAGE_KEY_SESSIONS);
      expect(parsed.length).toBe(1);
      expect(parsed[0]?.id).toBe("1");
    });

    test("should overwrite existing sessions", async () => {
      const firstSessions: Session[] = [
        {
          id: "1",
          name: "First",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await saveSessions(firstSessions);

      const secondSessions: Session[] = [
        {
          id: "2",
          name: "Second",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await saveSessions(secondSessions);

      const loaded = loadSessions();
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe("2");
    });
  });

  describe("loadCustomCommands", () => {
    test("should return empty array when no file exists", () => {
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

      writeJson(STORAGE_KEY_COMMANDS, testCommands);
      const loaded = loadCustomCommands();

      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe("1");
      expect(loaded[0]?.name).toBe("test");
    });

    test("should handle corrupted JSON gracefully", () => {
      writeFileSync(filePathFor(STORAGE_KEY_COMMANDS), "invalid json{");

      const commands = loadCustomCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });
  });

  describe("saveCustomCommands", () => {
    test("should save custom commands to disk", async () => {
      const commands: CustomCommand[] = [
        {
          id: "1",
          name: "test",
          description: "Test command",
          command: "echo test",
        },
      ];

      await saveCustomCommands(commands);
      const parsed = readJson(STORAGE_KEY_COMMANDS);
      expect(parsed.length).toBe(1);
      expect(parsed[0]?.name).toBe("test");
    });

    test("should overwrite existing commands", async () => {
      const firstCommands: CustomCommand[] = [
        { id: "1", name: "first", description: "First", command: "echo 1" },
      ];
      await saveCustomCommands(firstCommands);

      const secondCommands: CustomCommand[] = [
        { id: "2", name: "second", description: "Second", command: "echo 2" },
      ];
      await saveCustomCommands(secondCommands);

      const loaded = loadCustomCommands();
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.id).toBe("2");
    });
  });
});
