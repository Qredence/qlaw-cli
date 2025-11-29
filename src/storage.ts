import type { AppSettings, Session, CustomCommand, Action, KeySpec } from "./types.ts";
import { mkdir } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { debounce } from "./utils.ts";

export const STORAGE_KEY_SETTINGS = "qlaw_settings";
export const STORAGE_KEY_SESSIONS = "qlaw_sessions";
export const STORAGE_KEY_COMMANDS = "qlaw_custom_commands";

export const defaultKeybindings: Record<Action, KeySpec[]> = {
  nextSuggestion: [{ name: "down" }],
  prevSuggestion: [{ name: "up" }],
  autocomplete: [{ name: "tab" }],
};

// Get environment variables for default settings
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const AF_BRIDGE_BASE_URL = process.env.AF_BRIDGE_BASE_URL;
const AF_MODEL = process.env.AF_MODEL;

export const defaultSettings: AppSettings = {
  theme: "dark",
  showTimestamps: false,
  autoScroll: true,
  model: OPENAI_MODEL,
  endpoint: OPENAI_BASE_URL,
  apiKey: OPENAI_API_KEY,
  version: 1,
  keybindings: defaultKeybindings,
  afBridgeBaseUrl: AF_BRIDGE_BASE_URL,
  afModel: AF_MODEL,
  workflow: {
    enabled: false,
    defaultAgents: {
      coder: "coder",
      planner: "planner",
      reviewer: "reviewer",
      judge: "judge",
    },
    keybindings: {
      toggleMode: [{ name: "m", ctrl: true }],
    },
    options: {
      maxSteps: 10,
      judgeThreshold: 0.6,
    },
  },
};

// Cache the data directory path to avoid repeated environment variable lookups
// Note: We store both the override value and the computed result to detect env changes in tests
// Note: This is safe in single-threaded Node.js/Bun - concurrent access is not a concern for CLI apps
let cachedDataDir: string | null = null;
let cachedOverrideValue: string | undefined = undefined;

// Get data directory path (~/.qlaw-cli/)
function getDataDir(): string {
  const currentOverride = process.env.QLAW_DATA_DIR;
  
  // If override changed (e.g., in tests), invalidate cache
  if (cachedDataDir !== null && currentOverride !== cachedOverrideValue) {
    cachedDataDir = null;
  }
  
  if (cachedDataDir !== null) {
    return cachedDataDir;
  }
  
  cachedOverrideValue = currentOverride;
  
  if (currentOverride && currentOverride.trim().length > 0) {
    cachedDataDir = currentOverride;
    return cachedDataDir;
  }
  const home = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
  if (!home) {
    throw new Error("Could not determine home directory");
  }
  cachedDataDir = join(home, ".qlaw-cli");
  return cachedDataDir;
}

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  const dataDir = getDataDir();
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

// Get file path for a storage key
function getStoragePath(key: string): string {
  return join(getDataDir(), `${key}.json`);
}

// Helper functions for file-based storage
export function loadSettings(): AppSettings {
  try {
    const filePath = getStoragePath(STORAGE_KEY_SETTINGS);
    if (existsSync(filePath)) {
      const stored = readFileSync(filePath, "utf-8");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultSettings,
          ...parsed,
          keybindings: parsed.keybindings || defaultKeybindings,
          version: 1,
        };
      }
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return defaultSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = getStoragePath(STORAGE_KEY_SETTINGS);
    // Use Node.js-compatible fs/promises for cross-runtime compatibility
    const { writeFile } = await import("fs/promises");
    await writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export function loadSessions(): Session[] {
  try {
    const filePath = getStoragePath(STORAGE_KEY_SESSIONS);
    if (existsSync(filePath)) {
      const stored = readFileSync(filePath, "utf-8");
      if (stored) {
        return JSON.parse(stored, (key, value) => {
          if (key === "createdAt" || key === "updatedAt" || key === "timestamp") {
            return new Date(value);
          }
          return value;
        });
      }
    }
  } catch (e) {
    console.error("Failed to load sessions:", e);
  }
  return [];
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = getStoragePath(STORAGE_KEY_SESSIONS);
    await Bun.write(filePath, JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

export function loadCustomCommands(): CustomCommand[] {
  try {
    const filePath = getStoragePath(STORAGE_KEY_COMMANDS);
    if (existsSync(filePath)) {
      const stored = readFileSync(filePath, "utf-8");
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    console.error("Failed to load custom commands:", e);
  }
  return [];
}

export async function saveCustomCommands(commands: CustomCommand[]): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = getStoragePath(STORAGE_KEY_COMMANDS);
    await Bun.write(filePath, JSON.stringify(commands, null, 2));
  } catch (e) {
    console.error("Failed to save custom commands:", e);
  }
}

/**
 * Debounced versions of save functions to reduce file I/O operations
 * These functions batch rapid successive saves into a single disk write
 * after a 300ms delay, significantly improving performance during rapid state changes.
 */

// 300ms debounce delay - provides good balance between responsiveness and performance
const SAVE_DEBOUNCE_MS = 300;

export const debouncedSaveSettings = debounce(saveSettings, SAVE_DEBOUNCE_MS);
export const debouncedSaveSessions = debounce(saveSessions, SAVE_DEBOUNCE_MS);
export const debouncedSaveCustomCommands = debounce(saveCustomCommands, SAVE_DEBOUNCE_MS);
