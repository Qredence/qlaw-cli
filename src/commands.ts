export type BuiltInCommandName =
  | "clear"
  | "help"
  | "model"
  | "settings"
  | "sessions"
  | "status"
  | "terminal-setup"
  | "commands"
  | "export"
  | "theme"
  | "endpoint"
  | "api-key"
  | "af-bridge"
  | "af-model"
  | "keybindings"
  | "exit"
  | "quit"
  | "pwd"
  | "cwd"
  | "mode"
  | "workflow"
  | "agents"
  | "run"
  | "continue"
  | "judge";

export interface CommandMeta {
  name: BuiltInCommandName;
  description: string;
  keywords?: string[];
}

export const BUILT_IN_COMMANDS: CommandMeta[] = [
  { name: "clear", description: "Clear all messages", keywords: ["reset", "cls"] },
  { name: "help", description: "Show help", keywords: ["docs", "commands"] },
  { name: "model", description: "Set the model name", keywords: ["ai", "llm"] },
  { name: "settings", description: "Configure application settings", keywords: ["prefs"] },
  { name: "sessions", description: "List and select previous sessions", keywords: ["history"] },
  { name: "status", description: "Show current status and configuration", keywords: ["info"] },
  { name: "terminal-setup", description: "Configure terminal keybindings", keywords: ["keys"] },
  { name: "commands", description: "Manage custom commands", keywords: ["custom"] },
  { name: "export", description: "Export chat", keywords: ["save", "download"] },
  { name: "theme", description: "Toggle theme", keywords: ["dark", "light"] },
  { name: "endpoint", description: "Set the API endpoint base URL", keywords: ["openai", "azure", "url"] },
  { name: "api-key", description: "Set the API key (masked)", keywords: ["token", "auth"] },
  { name: "af-bridge", description: "Set Agent Framework bridge URL", keywords: ["workflow", "bridge"] },
  { name: "af-model", description: "Set Agent Framework model", keywords: ["fleet", "agents"] },
  { name: "keybindings", description: "View or edit suggestion keybindings", keywords: ["keys", "bindings"] },
  { name: "exit", description: "Exit the CLI", keywords: ["quit"] },
  { name: "quit", description: "Exit the CLI", keywords: ["exit"] },
  { name: "pwd", description: "Show current directory", keywords: ["cwd"] },
  { name: "cwd", description: "Change working directory", keywords: ["chdir"] },
  { name: "mode", description: "Switch between standard and workflow modes", keywords: ["toggle", "workflow"] },
  { name: "workflow", description: "Open workflow controls", keywords: ["pipeline", "agents"] },
  { name: "agents", description: "Show configured agents", keywords: ["coder", "planner", "reviewer", "judge"] },
  { name: "run", description: "Run the current workflow", keywords: ["start"] },
  { name: "continue", description: "Continue an existing workflow", keywords: ["resume"] },
  { name: "judge", description: "Invoke the judge agent", keywords: ["decision"] },
];

// Cache command names array to avoid recreating on every call
let cachedCommandNames: string[] | null = null;

export function getBuiltInCommandNames(): string[] {
  if (cachedCommandNames === null) {
    cachedCommandNames = BUILT_IN_COMMANDS.map((c) => c.name);
  }
  return cachedCommandNames;
}

export function getBuiltInDescription(name: string): string | undefined {
  const found = BUILT_IN_COMMANDS.find((c) => c.name === (name as BuiltInCommandName));
  return found?.description;
}

export interface MentionMeta {
  name: "context" | "file" | "code" | "docs" | "coder" | "planner" | "reviewer" | "judge";
  description: string;
}

export const MENTIONS: MentionMeta[] = [
  { name: "context", description: "Add context to your message" },
  { name: "file", description: "Reference a file (e.g., @file path/to/file)" },
  { name: "code", description: "Include a code snippet (e.g., @code your code here)" },
  { name: "docs", description: "Reference documentation (e.g., @docs topic)" },
  { name: "coder", description: "Route prompt to the Coder agent" },
  { name: "planner", description: "Route prompt to the Planner agent" },
  { name: "reviewer", description: "Route prompt to the Reviewer agent" },
  { name: "judge", description: "Route prompt to the Judge agent" },
];
