/**
 * Utility functions for terminal and common operations
 */

/**
 * Gets terminal dimensions, with fallback to defaults
 * Note: This function is synchronous and uses defaults if dimensions can't be detected
 */
export function getTerminalDimensions(): { width: number; height: number } {
  let terminalWidth = process.stdout.columns || 80;
  let terminalHeight = process.stdout.rows || 24;

  // If dimensions are already available, use them
  if (process.stdout.columns && process.stdout.rows) {
    return { width: terminalWidth, height: terminalHeight };
  }

  // Try to get dimensions from stty synchronously (fallback to defaults if fails)
  // Using Bun's built-in support for child_process
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("child_process");
    const size = execSync("stty size", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    })
      .trim()
      .split(" ");
    if (size.length === 2 && size[0] && size[1]) {
      terminalHeight = parseInt(size[0], 10) || 24;
      terminalWidth = parseInt(size[1], 10) || 80;
    }
  } catch {
    // Use defaults - this is fine for non-interactive contexts
  }

  return { width: terminalWidth, height: terminalHeight };
}

/**
 * Creates a stdout stream with dimensions, wrapping if needed
 */
export function createStdoutWithDimensions(): NodeJS.WriteStream {
  const { width, height } = getTerminalDimensions();

  if (process.stdout.columns && process.stdout.rows) {
    return process.stdout;
  }

  return Object.assign(Object.create(process.stdout), {
    columns: width,
    rows: height,
    isTTY: process.stdout.isTTY ?? true,
    write: process.stdout.write.bind(process.stdout),
    end: process.stdout.end.bind(process.stdout),
  });
}

