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
  | "api-key";

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
];

export function getBuiltInCommandNames(): string[] {
  return BUILT_IN_COMMANDS.map((c) => c.name);
}

export function getBuiltInDescription(name: string): string | undefined {
  const found = BUILT_IN_COMMANDS.find((c) => c.name === (name as BuiltInCommandName));
  return found?.description;
}

export interface MentionMeta {
  name: "context" | "file" | "code" | "docs";
  description: string;
}

export const MENTIONS: MentionMeta[] = [
  { name: "context", description: "Add context" },
  { name: "file", description: "Reference file" },
  { name: "code", description: "Code snippet" },
  { name: "docs", description: "Documentation" },
];
