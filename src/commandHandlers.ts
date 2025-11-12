import type {
  Message,
  Session,
  AppSettings,
  CustomCommand,
  ThemeName,
  Prompt,
} from "./types.ts";
import { generateUniqueId } from "./utils.ts";

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
  setMode?: (mode: "standard" | "workflow") => void;
  stop?: () => void;
}

export interface CommandResult {
  systemMessage?: Message;
  shouldReturn?: boolean;
}

export function handleClearCommand(
  context: CommandContext,
  args?: string
): CommandResult {
  const { messages, setMessages } = context;
  const confirm = (args || "").trim().toLowerCase();
  if (messages.length === 0) {
    return {
      systemMessage: {
        id: generateUniqueId(),
        role: "system",
        content: "Nothing to clear",
        timestamp: new Date(),
      },
    };
  }
  if (confirm === "confirm" || confirm === "!" || confirm === "yes") {
    setMessages([]);
    return {
      systemMessage: {
        id: generateUniqueId(),
        role: "system",
        content: "Conversation cleared",
        timestamp: new Date(),
      },
    };
  }
  return {
    systemMessage: {
      id: generateUniqueId(),
      role: "system",
      content: "To clear, run: /clear confirm",
      timestamp: new Date(),
    },
  };
}

export function handleHelpCommand(): CommandResult {
  const systemMsg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Help
general
  /help                Show help
  /clear [confirm]     Clear messages
  /status              Show status
  /theme               Toggle theme
  /terminal-setup      Configure terminal keys
ai
  /model <name>        Set model
  /endpoint <url>      Set API base URL
  /api-key <key>       Set API key
workflow
  /mode <standard|workflow>  Switch mode
  /workflow            Workflow controls
  /agents              Show agents
  /run                 Start workflow
  /continue            Continue workflow
  /judge               Invoke judge
mentions
  @context  @file <path>  @code <snippet>  @docs <topic>
  @coder @planner @reviewer @judge`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleModeCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  const desired = (args || "").trim().toLowerCase();
  let target: "standard" | "workflow" | null = null;
  if (desired === "standard" || desired === "workflow") {
    target = desired as any;
  }
  if (context.setMode) {
    if (target) {
      context.setMode(target);
    } else {
      // Toggle when no explicit arg provided
      // Fall back to a system message when mode state isn't known
      // Note: UI will reflect current mode in status bar
      context.setMode("workflow");
    }
  }
  const msg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Mode ${target ? "set" : "toggled"} to: ${target || "workflow"}`,
    timestamp: new Date(),
  };
  return { systemMessage: msg };
}

export function handleWorkflowCommand(): CommandResult {
  const msg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Workflow controls: Use /run to start, /continue to resume, /agents to view roles, and /judge to decide.`,
    timestamp: new Date(),
  };
  return { systemMessage: msg };
}

export function handleAgentsCommand(): CommandResult {
  const msg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Agents configured: coder, planner, reviewer, judge. Customize via settings (to be added).`,
    timestamp: new Date(),
  };
  return { systemMessage: msg };
}

export function handleRunCommand(): CommandResult {
  const msg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Starting workflow. Type your prompt and submit in workflow mode (use /mode workflow).`,
    timestamp: new Date(),
  };
  return { systemMessage: msg };
}

export function handleContinueCommand(): CommandResult {
  const msg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Continuing workflow. Provide follow-up input or use mentions like @reviewer or @judge.`,
    timestamp: new Date(),
  };
  return { systemMessage: msg };
}

export function handleJudgeCommand(): CommandResult {
  const msg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Judge agent ready. Summarize options and the judge will decide.`,
    timestamp: new Date(),
  };
  return { systemMessage: msg };
}

function handleSettingCommand(
  settingKey: "model" | "endpoint" | "apiKey",
  promptMessage: string,
  confirmationFormatter: (value: string) => string,
  args: string | undefined,
  context: CommandContext,
  shouldMaskValue: boolean = false
): CommandResult {
  const { settings, setSettings } = context;
  const val = args?.trim();
  
  if (val) {
    setSettings((prev) => ({ ...prev, [settingKey]: val }));
    const systemMsg: Message = {
      id: generateUniqueId(),
      role: "system",
      content: confirmationFormatter(val),
      timestamp: new Date(),
    };
    return { systemMessage: systemMsg };
  } else {
    const currentValue = settings[settingKey] || "Not set";
    const masked = shouldMaskValue && typeof currentValue === "string"
      ? (currentValue ? "***" + currentValue.slice(-4) : "Not set")
      : currentValue;
    const msg = `${promptMessage}\nCurrent: ${masked}\nUsage: /${settingKey} <value>`;
    return { systemMessage: { id: generateUniqueId(), role: "system", content: msg, timestamp: new Date() } };
  }
}

export function handleModelCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  return handleSettingCommand(
    "model",
    "Enter model name:",
    (v) => `Model set to: ${v}`,
    args,
    context
  );
}

export function handleEndpointCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  return handleSettingCommand(
    "endpoint",
    "Enter API endpoint base URL:",
    (v) => `Endpoint set to: ${v}`,
    args,
    context
  );
}

export function handleApiKeyCommand(
  args: string | undefined,
  context: CommandContext
): CommandResult {
  return handleSettingCommand(
    "apiKey",
    "Enter API key:",
    () => "API key updated.",
    args,
    context,
    true
  );
}

export function handleSettingsCommand(
  context: CommandContext
): CommandResult {
  const { settings } = context;
  const systemMsg: Message = {
    id: generateUniqueId(),
    role: "system",
    content: `Settings
Model:        ${settings.model || "Not set"}
Endpoint:     ${settings.endpoint || "Not set"}
API Key:      ${settings.apiKey ? "***" + settings.apiKey.slice(-4) : "Not set"}
Theme:        ${settings.theme}
Timestamps:   ${settings.showTimestamps ? "Shown" : "Hidden"}
Auto-scroll:  ${settings.autoScroll ? "Enabled" : "Disabled"}
Agent Bridge: ${settings.afBridgeBaseUrl || "Not set"}
AF Model:     ${settings.afModel || "Not set"}

Use /model, /endpoint, /api-key, /theme to change values`,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}

export function handleSessionsCommand(
  context: CommandContext
): CommandResult {
  const { sessions } = context;
  let content: string;
  if (sessions.length === 0) {
    content = `Sessions\nNo saved sessions`;
  } else {
    content = `Sessions\n${sessions
      .slice(-5)
      .map(
        (s, idx) => `${idx + 1}. ${s.name} (${s.messages.length} msgs, ${new Date(s.updatedAt).toLocaleDateString()})`
      )
      .join("\n")}`;
  }
  return {
    systemMessage: { id: generateUniqueId(), role: "system", content, timestamp: new Date() },
  };
}

export function handleStatusCommand(
  context: CommandContext
): CommandResult {
  const { settings, sessions, messages, customCommands } = context;
  const systemMsg: Message = {
    id: generateUniqueId(),
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
    id: generateUniqueId(),
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
    id: generateUniqueId(),
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
    id: generateUniqueId(),
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
    id: generateUniqueId(),
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
    id: generateUniqueId(),
    role: "system",
    content,
    timestamp: new Date(),
  };
  return { systemMessage: systemMsg };
}
export function handleExitCommand(context: CommandContext): CommandResult {
  context.stop?.();
  return { shouldReturn: true };
}

export function handlePwdCommand(): CommandResult {
  const path = process.cwd().replace(process.env.HOME || "", "~");
  return {
    systemMessage: {
      id: generateUniqueId(),
      role: "system",
      content: `cwd: ${path}`,
      timestamp: new Date(),
    },
  };
}

export function handleCwdCommand(args: string | undefined): CommandResult {
  const dest = (args || "").trim();
  if (!dest) {
    return {
      systemMessage: {
        id: generateUniqueId(),
        role: "system",
        content: "Usage: /cwd <directory>",
        timestamp: new Date(),
      },
    };
  }
  try {
    process.chdir(dest);
    return {
      systemMessage: {
        id: generateUniqueId(),
        role: "system",
        content: `Changed directory to ${process.cwd()}`,
        timestamp: new Date(),
      },
    };
  } catch (e: any) {
    return {
      systemMessage: {
        id: generateUniqueId(),
        role: "system",
        content: `Failed to change directory: ${e?.message || e}`,
        timestamp: new Date(),
      },
    };
  }
}
