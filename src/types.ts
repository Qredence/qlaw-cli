export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type ThemeName = "dark" | "light";

export type Action = "nextSuggestion" | "prevSuggestion" | "autocomplete";

export interface KeySpec {
  name: string; // e.g. "up", "down", "tab", "k"
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export interface AppSettings {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  theme: ThemeName;
  showTimestamps: boolean;
  autoScroll: boolean;
  version: number;
  keybindings: Record<Action, KeySpec[]>;
  // Agent Framework bridge settings
  afBridgeBaseUrl?: string;
  afModel?: string;
}

export interface CustomCommand {
  id: string;
  name: string;
  description: string;
  command: string;
}

export type InputMode =
  | "chat"
  | "command"
  | "mention"
  | "settings-menu";

export type Prompt =
  | {
      type: "confirm";
      message: string;
      onConfirm: () => void;
      onCancel?: () => void;
    }
  | {
      type: "input";
      message: string;
      defaultValue?: string;
      placeholder?: string;
      onConfirm: (value: string) => void;
      onCancel?: () => void;
    };

