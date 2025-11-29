export type LogLevel = "debug" | "info" | "warn" | "error";

// Cache log level configuration to avoid reading environment variable on every log call
const LOG_LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
let cachedLogLevel: LogLevel | null = null;
let cachedLogLevelValue: number = 20; // Default to "info" level value

function getLogLevelConfig(): { level: LogLevel; value: number } {
  if (cachedLogLevel === null) {
    const env = (process.env.QLAW_LOG_LEVEL || "info").toLowerCase() as LogLevel;
    cachedLogLevel = LOG_LEVEL_ORDER[env] !== undefined ? env : "info";
    cachedLogLevelValue = LOG_LEVEL_ORDER[cachedLogLevel];
  }
  return { level: cachedLogLevel, value: cachedLogLevelValue };
}

function enabled(level: LogLevel): boolean {
  const config = getLogLevelConfig();
  return LOG_LEVEL_ORDER[level] >= config.value || config.level === "debug";
}

export function debug(message: string, meta?: Record<string, any>) {
  if (enabled("debug")) console.debug(message, meta || "");
}

export function info(message: string, meta?: Record<string, any>) {
  if (enabled("info")) console.info(message, meta || "");
}

export function warn(message: string, meta?: Record<string, any>) {
  if (enabled("warn")) console.warn(message, meta || "");
}

export function error(message: string, meta?: Record<string, any>) {
  if (enabled("error")) console.error(message, meta || "");
}

