import type {
  Message,
  Session,
  AppSettings,
  CustomCommand,
  ThemeName,
  Prompt,
} from "./types.ts";

export interface CommandContext {
  settings: AppSettings;
  sessions: Session[];
  messages: Message[];
  customCommands: CustomCommand[];
  currentSessionId: string | null;
  setSettings: (settings: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setPrompt: (prompt: Prompt | null) => void;
  setPromptInputValue: (value: string) => void;
  setShowSettingsMenu: (show: boolean) => void;
  setShowSessionList: (show: boolean) => void;
}

export interface CommandResult {
  systemMessage?: Message;
  shouldReturn?: boolean;
}

export function handleClearCommand(
  context: CommandContext
): CommandResult {
  const { messages, setPrompt, setPromptInputValue, setMessages } = context;
  
  if (messages.length > 0) {
    setPrompt({
      type: "confirm",
      message: "Clear all messages?",
      onConfirm: () => {
        setMessages([]);
        setPrompt(null);
        setPromptInputValue("");
      },
      onCancel: () => {
        setPrompt(null);
        setPromptInputValue("");
      },
    });
  }
  return { shouldReturn: true };
}

export function handleHelpCommand(): CommandResult {
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content: `Available commands:
/clear              Clear all messages
/help               Show this help
/model              Set the model name
/endpoint           Set the API endpoint base URL
/api-key            Set the API key
/settings           Configure application settings
/sessions           List and select previous sessions
/status             Show current status and configuration
/terminal-setup     Configure terminal keybindings
/commands           Manage custom commands
/export             Export chat
/theme              Toggle theme

Mentions:
@context - Add context to your message
@file <path> - Reference a file in your message
@code <snippet> - Include a code snippet
@docs <topic> - Reference documentation`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleModelCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  const { settings, setSettings, setPrompt, setPromptInputValue, setMessages } = context;
  const val = args?.trim();
  
  if (val) {
    setSettings((prev) => ({ ...prev, model: val }));
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: "system",
      content: `Model set to: ${val}`,
      timestamp: new Date(),
    };
    return { systemMessage: systemMsg };
  } else {
    setPromptInputValue(settings.model || "");
    setPrompt({
      type: "input",
      message: "Enter model name:",
      defaultValue: settings.model || "",
      onConfirm: (v) => {
        setSettings((prev) => ({ ...prev, model: v.trim() }));
        setPrompt(null);
        setPromptInputValue("");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Model set to: ${v.trim()}`,
            timestamp: new Date(),
          },
        ]);
      },
      onCancel: () => {
        setPrompt(null);
        setPromptInputValue("");
      },
    });
    return { shouldReturn: true };
  }
}

export function handleEndpointCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  const { settings, setSettings, setPrompt, setPromptInputValue, setMessages } = context;
  const val = args?.trim();
  
  if (val) {
    setSettings((prev) => ({ ...prev, endpoint: val }));
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: "system",
      content: `Endpoint set to: ${val}`,
      timestamp: new Date(),
    };
    return { systemMessage: systemMsg };
  } else {
    setPromptInputValue(settings.endpoint || "");
    setPrompt({
      type: "input",
      message: "Enter API endpoint base URL:",
      defaultValue: settings.endpoint || "",
      onConfirm: (v) => {
        setSettings((prev) => ({ ...prev, endpoint: v.trim() }));
        setPrompt(null);
        setPromptInputValue("");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Endpoint set to: ${v.trim()}`,
            timestamp: new Date(),
          },
        ]);
      },
      onCancel: () => {
        setPrompt(null);
        setPromptInputValue("");
      },
    });
    return { shouldReturn: true };
  }
}

export function handleApiKeyCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  const { settings, setSettings, setPrompt, setPromptInputValue, setMessages } = context;
  const val = args?.trim();
  
  if (val) {
    setSettings((prev) => ({ ...prev, apiKey: val }));
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: "system",
      content: `API key updated.`,
      timestamp: new Date(),
    };
    return { systemMessage: systemMsg };
  } else {
    setPromptInputValue(settings.apiKey || "");
    setPrompt({
      type: "input",
      message: "Enter API key:",
      defaultValue: settings.apiKey || "",
      onConfirm: (v) => {
        setSettings((prev) => ({ ...prev, apiKey: v.trim() }));
        setPrompt(null);
        setPromptInputValue("");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            content: `API key updated.`,
            timestamp: new Date(),
          },
        ]);
      },
      onCancel: () => {
        setPrompt(null);
        setPromptInputValue("");
      },
    });
    return { shouldReturn: true };
  }
}

export function handleSettingsCommand(
  context: CommandContext
): CommandResult {
  context.setShowSettingsMenu(true);
  return { shouldReturn: true };
}

export function handleSessionsCommand(
  context: CommandContext
): CommandResult {
  context.setShowSessionList(true);
  return { shouldReturn: true };
}

export function handleStatusCommand(
  context: CommandContext
): CommandResult {
  const { settings, sessions, messages, customCommands } = context;
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content: `Current Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:        ${settings.model || "Not set"}
Endpoint:     ${settings.endpoint || "Not set"}
API Key:      ${settings.apiKey ? "***" + settings.apiKey.slice(-4) : "Not set"}
Theme:        ${settings.theme}
Timestamps:   ${settings.showTimestamps ? "Shown" : "Hidden"}
Auto-scroll:  ${settings.autoScroll ? "Enabled" : "Disabled"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sessions:     ${sessions.length} saved
Messages:     ${messages.length} in current chat
Custom Cmds:  ${customCommands.length} defined`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleTerminalSetupCommand(): CommandResult {
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content: `Terminal Keybindings Setup:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For multiline input support:

VS Code / Cursor / Windsurf:
  Add to keybindings.json:
  {
    "key": "shift+enter",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "\\n" }
  }

Windows Terminal:
  Add to settings.json:
  {
    "command": { "action": "sendInput", "input": "\\n" },
    "keys": "shift+enter"
  }

Current shortcuts:
  Ctrl+C / Esc  - Exit
  Ctrl+K        - Toggle debug console`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleCommandsCommand(
  context: CommandContext
): CommandResult {
  const { customCommands } = context;
  let content: string;
  
  if (customCommands.length === 0) {
    content = `Custom Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No custom commands defined yet.

To add a command, use:
/commands add <name> <description> <command>

Example:
/commands add git-status "Show git status" "git status"`;
  } else {
    const cmdList = customCommands
      .map(
        (c, i) =>
          `${i + 1}. /${c.name}\n   ${c.description}\n   → ${c.command}`
      )
      .join("\n\n");
    content = `Custom Commands:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${cmdList}\n\nUse: /commands remove <name>`;
  }
  
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleThemeCommand(
  context: CommandContext
): CommandResult {
  const { settings, setSettings } = context;
  const newTheme: ThemeName = settings.theme === "dark" ? "light" : "dark";
  setSettings((prev) => ({ ...prev, theme: newTheme }));
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content: `Theme changed to: ${newTheme}`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleExportCommand(
  context: CommandContext
): CommandResult {
  const { messages, settings, currentSessionId } = context;
  const exportData = {
    session: {
      id: currentSessionId || "current",
      exportedAt: new Date().toISOString(),
    },
    messages,
    settings,
  };
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content: `Chat export:\n${JSON.stringify(exportData, null, 2)}`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleUnknownCommand(
  command: string,
  context: CommandContext
): CommandResult {
  const { customCommands } = context;
  const customCmd = customCommands.find((c) => c.name === command.toLowerCase());
  
  let content: string;
  if (customCmd) {
    content = `Executing: ${customCmd.command}\n(Custom command execution not yet implemented)`;
  } else {
    content = `Unknown command: /${command}\nType /help for available commands`;
  }
  
  const systemMsg: Message = {
    id: Date.now().toString(),
    role: "system",
    content,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

