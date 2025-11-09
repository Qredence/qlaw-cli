#!/usr/bin/env bun
import { TextAttributes, createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface AppSettings {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  theme: "dark" | "light";
  showTimestamps: boolean;
  autoScroll: boolean;
}

interface CustomCommand {
  id: string;
  name: string;
  description: string;
  command: string;
}

// --- OpenAI Responses API (streaming) integration ---
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;

function getAuthHeader(
  baseUrl: string | undefined,
  apiKey: string
): Record<string, string> {
  // Use Azure-compatible header if the base URL looks like Azure; otherwise standard Bearer
  if (
    baseUrl &&
    (baseUrl.includes("azure.com") || baseUrl.includes("/openai/"))
  ) {
    return { "api-key": apiKey };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

// Build a plain-text prompt from history for broad compatibility with proxies
function buildResponsesInput(history: Message[]) {
  const lines: string[] = [];
  for (const m of history) {
    const role =
      m.role === "assistant"
        ? "Assistant"
        : m.role === "system"
        ? "System"
        : "User";
    lines.push(`${role}: ${m.content}`);
  }
  lines.push("Assistant:");
  return lines.join("\n\n");
}

async function streamResponseFromOpenAI(params: {
  history: Message[];
  onDelta: (text: string) => void;
  onError: (err: Error) => void;
  onDone: () => void;
}) {
  const { history, onDelta, onError, onDone } = params;

  if (!OPENAI_BASE_URL || !OPENAI_API_KEY || !OPENAI_MODEL) {
    onError(
      new Error("Missing OPENAI_BASE_URL, OPENAI_API_KEY, or OPENAI_MODEL")
    );
    onDone();
    return;
  }

  try {
    const authHeaders = getAuthHeader(OPENAI_BASE_URL, OPENAI_API_KEY);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders,
    };

    const res = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildResponsesInput(history),
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buf = "";
    let currentEvent: string | null = null;

    // SSE parsing: events separated by blank lines; each event has optional "event:" and one or more "data:" lines
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Split by lines and process whenever we hit a blank line
      const parts = buf.split(/\r?\n/);
      // Keep the last partial line in buffer
      buf = parts.pop() || "";

      for (const line of parts) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          if (jsonStr === "[DONE]") {
            currentEvent = null;
            continue;
          }
          try {
            const payload = jsonStr ? JSON.parse(jsonStr) : null;
            // Handle common Responses API streaming events
            // Prefer output_text.delta/ message delta styles
            if (
              currentEvent === "response.output_text.delta" ||
              currentEvent === "message.delta" ||
              currentEvent === "response.delta"
            ) {
              const delta =
                payload?.delta ??
                payload?.text ??
                payload?.content ??
                payload?.output_text?.delta ??
                "";
              if (delta) onDelta(delta);
            } else if (currentEvent === "response.error") {
              const msg =
                payload?.error?.message || payload?.message || "Unknown error";
              throw new Error(msg);
            } else if (currentEvent === "response.completed") {
              // completion signal
              currentEvent = null;
            } else if (payload && typeof payload === "object") {
              // Fallback: if we see any payload with text, append
              const fallback =
                payload?.delta ?? payload?.text ?? payload?.content;
              if (typeof fallback === "string" && fallback) onDelta(fallback);
            }
          } catch (e: any) {
            // Ignore parse errors for keep-alive/comment lines
            // But if it's clearly JSON and failed, surface once
            // console.error("SSE parse error", e)
          }
        } else if (line.trim() === "") {
          // End of event
          currentEvent = null;
        }
      }
    }

    onDone();
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)));
    onDone();
  }
}

type InputMode =
  | "chat"
  | "command"
  | "mention"
  | "model-input"
  | "settings-menu";

const STORAGE_KEY_SETTINGS = "qlaw_settings";
const STORAGE_KEY_SESSIONS = "qlaw_sessions";
const STORAGE_KEY_COMMANDS = "qlaw_custom_commands";

// Design tokens - Claude Code style
const COLORS = {
  bg: {
    primary: "#1A1A1A",
    secondary: "#232323",
    panel: "#2A2A2A",
    hover: "#333333",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#B8B8B8",
    tertiary: "#888888",
    dim: "#666666",
    accent: "#D4A574", // Warm accent
  },
  border: "#3A3A3A",
  success: "#7AC47A",
  error: "#E57373",
};

// Helper functions for localStorage
function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

function loadSessions(): Session[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (stored) {
      return JSON.parse(stored, (key, value) => {
        if (key === "createdAt" || key === "updatedAt" || key === "timestamp") {
          return new Date(value);
        }
        return value;
      });
    }
  } catch (e) {
    console.error("Failed to load sessions:", e);
  }
  return [];
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

function loadCustomCommands(): CustomCommand[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMMANDS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load custom commands:", e);
  }
  return [];
}

function saveCustomCommands(commands: CustomCommand[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COMMANDS, JSON.stringify(commands));
  } catch (e) {
    console.error("Failed to save custom commands:", e);
  }
}

const defaultSettings: AppSettings = {
  theme: "dark",
  showTimestamps: false,
  autoScroll: true,
  model: OPENAI_MODEL,
  endpoint: OPENAI_BASE_URL,
  apiKey: OPENAI_API_KEY,
};

function App() {
  const renderer = useRenderer();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("chat");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>(() =>
    loadCustomCommands()
  );
  const [showSessionList, setShowSessionList] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const scrollBoxRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (settings.autoScroll && scrollBoxRef.current) {
      scrollBoxRef.current.scrollToBottom?.();
    }
  }, [messages, settings.autoScroll]);

  // Save settings when changed
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save sessions when changed
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Save custom commands when changed
  useEffect(() => {
    saveCustomCommands(customCommands);
  }, [customCommands]);

  // Save current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages, updatedAt: new Date() }
            : s
        )
      );
    }
  }, [messages, currentSessionId]);

  // Command detection
  useEffect(() => {
    if (input.startsWith("/")) {
      setInputMode("command");
      const query = input.slice(1).toLowerCase();
      const builtInCommands = [
        "clear",
        "help",
        "model",
        "settings",
        "sessions",
        "status",
        "terminal-setup",
        "commands",
        "export",
        "theme",
      ];
      const customCommandNames = customCommands.map((c) => c.name);
      const allCommands = [...builtInCommands, ...customCommandNames];
      const filtered = allCommands.filter((cmd) => cmd.startsWith(query));
      setSuggestions(filtered);
      setSelectedSuggestionIndex(0); // Reset selection when suggestions change
    } else if (input.startsWith("@")) {
      setInputMode("mention");
      const query = input.slice(1).toLowerCase();
      const availableMentions = ["context", "file", "code", "docs"];
      const filtered = availableMentions.filter((m) => m.startsWith(query));
      setSuggestions(filtered);
      setSelectedSuggestionIndex(0);
    } else {
      setInputMode("chat");
      setSuggestions([]);
      setSelectedSuggestionIndex(0);
    }
  }, [input, customCommands]);

  useKeyboard((key) => {
    // Handle arrow keys for suggestion navigation
    if (suggestions.length > 0 && (key.name === "up" || key.name === "down")) {
      if (key.name === "up") {
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (key.name === "down") {
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    // Tab to autocomplete selected suggestion
    if (suggestions.length > 0 && key.name === "tab") {
      const selected = suggestions[selectedSuggestionIndex];
      if (inputMode === "command") {
        setInput(`/${selected}`);
      } else if (inputMode === "mention") {
        setInput(`@${selected}`);
      }
      return;
    }

    // Close overlays with Escape
    if (key.name === "escape") {
      if (showSessionList) {
        setShowSessionList(false);
        return;
      }
      if (showSettingsMenu) {
        setShowSettingsMenu(false);
        return;
      }
      renderer?.stop();
      return;
    }

    // Toggle debug console with Ctrl+K
    if (key.ctrl && key.name === "k") {
      renderer?.toggleDebugOverlay();
      renderer?.console.toggle();
    }

    // Exit with Ctrl+C
    if (key.ctrl && key.name === "c") {
      renderer?.stop();
    }
  });

  const handleInput = useCallback((value: string) => {
    setInput(value);
  }, []);

  const executeCommand = useCallback(
    (command: string, args?: string) => {
      const cmd = command.toLowerCase();
      const systemMsg: Message = {
        id: Date.now().toString(),
        role: "system",
        content: "",
        timestamp: new Date(),
      };

      switch (cmd) {
        case "clear":
          setMessages([]);
          return;

        case "help":
          systemMsg.content = `Available commands:
/clear              Clear all messages
/help               Show this help
/model              Set the model name
/settings           Configure application settings
/sessions           List and select previous sessions
/status             Show current status and configuration
/terminal-setup     Configure terminal keybindings
/commands           Manage custom commands
/export             Export chat
/theme              Toggle theme

Mentions:
@context - Add context
@file - Reference file
@code - Code snippet
@docs - Documentation`;
          break;

        case "model":
          if (args?.trim()) {
            setSettings((prev) => ({ ...prev, model: args.trim() }));
            systemMsg.content = `Model set to: ${args.trim()}`;
          } else {
            setInputMode("model-input");
            systemMsg.content =
              "Enter model name (e.g., gpt-4, claude-3-opus-20240229):";
          }
          break;

        case "settings":
          setShowSettingsMenu(true);
          return;

        case "sessions":
          setShowSessionList(true);
          return;

        case "status":
          systemMsg.content = `Current Configuration:
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
Custom Cmds:  ${customCommands.length} defined`;
          break;

        case "terminal-setup":
          systemMsg.content = `Terminal Keybindings Setup:
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
  Ctrl+K        - Toggle debug console`;
          break;

        case "commands":
          if (customCommands.length === 0) {
            systemMsg.content = `Custom Commands:
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
            systemMsg.content = `Custom Commands:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${cmdList}\n\nUse: /commands remove <name>`;
          }
          break;

        case "theme":
          const newTheme = settings.theme === "dark" ? "light" : "dark";
          setSettings((prev) => ({ ...prev, theme: newTheme }));
          systemMsg.content = `Theme changed to: ${newTheme}`;
          break;

        case "export":
          const exportData = {
            session: {
              id: currentSessionId || "current",
              exportedAt: new Date().toISOString(),
            },
            messages,
            settings,
          };
          systemMsg.content = `Chat export:\n${JSON.stringify(
            exportData,
            null,
            2
          )}`;
          break;

        default:
          // Check custom commands
          const customCmd = customCommands.find((c) => c.name === cmd);
          if (customCmd) {
            systemMsg.content = `Executing: ${customCmd.command}\n(Custom command execution not yet implemented)`;
          } else {
            systemMsg.content = `Unknown command: /${cmd}\nType /help for available commands`;
          }
      }

      setMessages((prev) => [...prev, systemMsg]);
    },
    [settings, sessions, messages, customCommands, currentSessionId]
  );

  const handleSubmit = useCallback(() => {
    if (isProcessing) return;

    // If suggestions are visible, select the highlighted suggestion
    if (
      suggestions.length > 0 &&
      (inputMode === "command" || inputMode === "mention")
    ) {
      const selected = suggestions[selectedSuggestionIndex];
      if (inputMode === "command" && selected) {
        // Execute the command immediately
        executeCommand(selected, "");
        setInput("");
        setSuggestions([]);
        setInputMode("chat");
        return;
      } else if (inputMode === "mention") {
        // For mentions, just complete the input
        setInput(`@${selected} `);
        setSuggestions([]);
        return;
      }
    }

    if (!input.trim()) return;

    // Handle model input mode
    if (inputMode === "model-input") {
      setSettings((prev) => ({ ...prev, model: input.trim() }));
      const systemMsg: Message = {
        id: Date.now().toString(),
        role: "system",
        content: `Model set to: ${input.trim()}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMsg]);
      setInput("");
      setInputMode("chat");
      return;
    }

    // Handle commands
    if (input.startsWith("/")) {
      const parts = input.slice(1).split(" ");
      const cmd = parts[0];
      const args = parts.slice(1).join(" ");
      if (cmd) {
        executeCommand(cmd, args);
      }
      setInput("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Prepare assistant message placeholder to stream into
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // Update UI immediately
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsProcessing(true);

    // Build history for this turn (use current state + new user)
    const historyForApi = [...messages, userMessage];

    // Stream from OpenAI Responses API
    streamResponseFromOpenAI({
      history: historyForApi,
      onDelta: (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: m.content + `\n\n[Error] ${err.message}` }
              : m
          )
        );
      },
      onDone: () => {
        setIsProcessing(false);
      },
    });
  }, [
    input,
    isProcessing,
    inputMode,
    executeCommand,
    messages,
    suggestions,
    selectedSuggestionIndex,
  ]);

  // Show welcome screen if no messages
  const showWelcome = messages.length === 0;

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      style={{ backgroundColor: COLORS.bg.primary }}
    >
      {/* Header */}
      <box
        style={{
          height: 1,
          backgroundColor: COLORS.bg.primary,
          paddingLeft: 2,
          paddingRight: 2,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <text
          content="QLAW CLI"
          style={{
            fg: COLORS.text.secondary,
            attributes: TextAttributes.DIM,
          }}
        />
        <text
          content=""
          style={{
            fg: COLORS.text.dim,
            attributes: TextAttributes.DIM,
          }}
        />
      </box>

      {/* Main Content Area */}
      <scrollbox
        ref={scrollBoxRef}
        style={{
          flexGrow: 1,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          backgroundColor: COLORS.bg.primary,
        }}
      >
        {showWelcome ? (
          <box flexDirection="column" style={{ width: "100%" }}>
            <box style={{ flexDirection: "row" }}>
              {/* Left panel */}
              <box
                flexDirection="column"
                style={{
                  width: 72,
                  backgroundColor: COLORS.bg.panel,
                  border: true,
                  borderColor: COLORS.border,
                  padding: 2,
                  marginRight: 2,
                }}
              >
                {/* Simple title */}
                <text
                  content="QLAW CLI"
                  style={{
                    fg: COLORS.text.primary,
                    attributes: TextAttributes.BOLD,
                    marginBottom: 1,
                  }}
                />

                <text
                  content={`${process
                    .cwd()
                    .replace(process.env.HOME || "", "~")}`}
                  style={{
                    fg: COLORS.text.dim,
                    attributes: TextAttributes.DIM,
                    marginBottom: 1,
                  }}
                />
                <text
                  content="SessionStart:Callback hook succeeded: Success"
                  style={{
                    fg: COLORS.text.tertiary,
                    attributes: TextAttributes.DIM,
                  }}
                />
              </box>

              {/* Right panel */}
              <box
                flexDirection="column"
                style={{
                  width: 48,
                  backgroundColor: COLORS.bg.panel,
                  border: true,
                  borderColor: COLORS.border,
                  padding: 2,
                }}
              >
                <text
                  content="Tips for getting started"
                  style={{
                    fg: COLORS.text.accent,
                    attributes: TextAttributes.BOLD,
                    marginBottom: 1,
                  }}
                />
                <text
                  content="Run /help to see commands. Type @ to reference context. Use ESC to exit."
                  style={{ fg: COLORS.text.secondary }}
                />
              </box>
            </box>
          </box>
        ) : (
          <box flexDirection="column" style={{ width: "100%" }}>
            {messages.map((message, index) => (
              <box
                key={message.id}
                style={{
                  marginBottom: index < messages.length - 1 ? 3 : 0,
                  flexDirection: "column",
                }}
              >
                {/* Message Header with Icon */}
                <box style={{ marginBottom: 1 }}>
                  <text
                    content="> "
                    style={{
                      fg: COLORS.text.secondary,
                    }}
                  />
                  <text
                    content={
                      message.role === "user"
                        ? message.content.substring(0, 80)
                        : message.role === "system"
                        ? "System"
                        : "Assistant"
                    }
                    style={{
                      fg: COLORS.text.primary,
                    }}
                  />
                </box>

                {/* Message Content */}
                <text
                  content={
                    message.content ||
                    (isProcessing && message.role === "assistant" ? "●" : "")
                  }
                  style={{
                    fg: COLORS.text.primary,
                  }}
                />

                {/* Timestamp - always hidden for cleaner look */}
              </box>
            ))}
          </box>
        )}
      </scrollbox>

      {/* Session List Overlay */}
      {showSessionList && (
        <box
          style={{
            position: "absolute",
            top: 5,
            left: 10,
            right: 10,
            maxHeight: 20,
            backgroundColor: COLORS.bg.panel,
            border: true,
            borderColor: COLORS.border,
            padding: 2,
            zIndex: 100,
          }}
        >
          <box flexDirection="column" style={{ width: "100%" }}>
            <text
              content="Sessions"
              style={{
                fg: COLORS.text.accent,
                attributes: TextAttributes.BOLD,
                marginBottom: 1,
              }}
            />
            {sessions.length === 0 ? (
              <text
                content="No saved sessions"
                style={{ fg: COLORS.text.tertiary }}
              />
            ) : (
              sessions
                .slice(-5)
                .map((session, idx) => (
                  <text
                    key={session.id}
                    content={`${idx + 1}. ${session.name} (${
                      session.messages.length
                    } msgs, ${new Date(
                      session.updatedAt
                    ).toLocaleDateString()})`}
                    style={{ fg: COLORS.text.secondary, marginTop: 1 }}
                  />
                ))
            )}
            <text
              content="\nPress ESC to close"
              style={{
                fg: COLORS.text.dim,
                attributes: TextAttributes.DIM,
                marginTop: 1,
              }}
            />
          </box>
        </box>
      )}

      {/* Settings Menu Overlay */}
      {showSettingsMenu && (
        <box
          style={{
            position: "absolute",
            top: 5,
            left: 10,
            right: 10,
            maxHeight: 25,
            backgroundColor: COLORS.bg.panel,
            border: true,
            borderColor: COLORS.border,
            padding: 2,
            zIndex: 100,
          }}
        >
          <box flexDirection="column" style={{ width: "100%" }}>
            <text
              content="Settings"
              style={{
                fg: COLORS.text.accent,
                attributes: TextAttributes.BOLD,
                marginBottom: 1,
              }}
            />
            <text
              content={`Model: ${settings.model || "Not set"}`}
              style={{ fg: COLORS.text.secondary, marginTop: 1 }}
            />
            <text
              content={`Endpoint: ${settings.endpoint || "Not set"}`}
              style={{ fg: COLORS.text.secondary, marginTop: 1 }}
            />
            <text
              content={`API Key: ${
                settings.apiKey ? "***" + settings.apiKey.slice(-4) : "Not set"
              }`}
              style={{ fg: COLORS.text.secondary, marginTop: 1 }}
            />
            <text
              content={`Theme: ${settings.theme}`}
              style={{ fg: COLORS.text.secondary, marginTop: 1 }}
            />
            <text
              content={`Timestamps: ${
                settings.showTimestamps ? "Shown" : "Hidden"
              }`}
              style={{ fg: COLORS.text.secondary, marginTop: 1 }}
            />
            <text
              content={`Auto-scroll: ${
                settings.autoScroll ? "Enabled" : "Disabled"
              }`}
              style={{ fg: COLORS.text.secondary, marginTop: 1 }}
            />
            <text
              content="\nUse /model, /theme, /status to change settings\nPress ESC to close"
              style={{
                fg: COLORS.text.dim,
                attributes: TextAttributes.DIM,
                marginTop: 2,
              }}
            />
          </box>
        </box>
      )}

      {/* Input Area */}
      <box
        style={{
          backgroundColor: COLORS.bg.primary,
          border: true,
          borderColor: COLORS.border,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 0,
          flexDirection: "column",
        }}
      >
        {/* Command/Mention Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <box
            style={{
              marginBottom: 1,
              backgroundColor: COLORS.bg.panel,
              border: true,
              borderColor: COLORS.border,
              paddingLeft: 1,
              paddingRight: 1,
              paddingTop: 1,
              paddingBottom: 1,
              flexDirection: "column",
            }}
          >
            {suggestions.map((suggestion, index) => {
              const isSelected = index === selectedSuggestionIndex;
              const prefix = inputMode === "command" ? "/" : "@";

              // Get description based on command
              let description = "";
              if (inputMode === "command") {
                const descriptions: Record<string, string> = {
                  clear: "Clear all messages",
                  help: "Show this help",
                  model: "Set the model name",
                  settings: "Configure application settings",
                  sessions: "List and select previous sessions",
                  status: "Show current status and configuration",
                  "terminal-setup": "Configure terminal keybindings",
                  commands: "Manage custom commands",
                  export: "Export chat",
                  theme: "Toggle theme",
                };
                description = descriptions[suggestion] || "Custom command";
              } else {
                const descriptions: Record<string, string> = {
                  context: "Add context",
                  file: "Reference file",
                  code: "Code snippet",
                  docs: "Documentation",
                };
                description = descriptions[suggestion] || "";
              }

              return (
                <box
                  key={suggestion}
                  style={{
                    paddingLeft: 1,
                    paddingRight: 1,
                    backgroundColor: isSelected
                      ? COLORS.bg.hover
                      : "transparent",
                    marginTop: index > 0 ? 1 : 0,
                  }}
                >
                  <text
                    content={`${prefix}${suggestion}`}
                    style={{
                      fg: isSelected
                        ? COLORS.text.accent
                        : COLORS.text.secondary,
                      attributes: isSelected ? TextAttributes.BOLD : 0,
                      width: 20,
                    }}
                  />
                  <text
                    content={description}
                    style={{
                      fg: COLORS.text.tertiary,
                      attributes: TextAttributes.DIM,
                      marginLeft: 2,
                    }}
                  />
                </box>
              );
            })}
          </box>
        )}
        {/* Input Field */}
        <box
          style={{
            border: true,
            borderColor: COLORS.border,
            backgroundColor: COLORS.bg.panel,
            paddingLeft: 1,
            paddingRight: 1,
            paddingTop: 1,
            paddingBottom: 1,
            marginBottom: 1,
            height: 3,
          }}
        >
          <text content="> " style={{ fg: COLORS.text.secondary }} />
          <input
            placeholder={
              inputMode === "command"
                ? "Type command name..."
                : inputMode === "mention"
                ? "Select mention type..."
                : inputMode === "model-input"
                ? "Enter model name..."
                : "Write a message…"
            }
            value={input}
            onInput={handleInput}
            onSubmit={handleSubmit}
            focused={!isProcessing && !showSessionList && !showSettingsMenu}
            style={{
              flexGrow: 1,
              backgroundColor: COLORS.bg.panel,
              focusedBackgroundColor: COLORS.bg.panel,
            }}
          />
        </box>

        {/* Status Line */}
        <box style={{ justifyContent: "space-between", alignItems: "center" }}>
          <text
            content={
              isProcessing
                ? "Warping... (esc to interrupt · 4s · ↑ 0 tokens)"
                : suggestions.length > 0
                ? "↑↓ navigate · tab autocomplete · enter submit"
                : "? for shortcuts"
            }
            style={{
              fg: COLORS.text.dim,
              attributes: TextAttributes.DIM,
            }}
          />
          <text
            content={isProcessing ? "Thinking off (tab to toggle)" : ""}
            style={{
              fg: COLORS.text.dim,
              attributes: TextAttributes.DIM,
            }}
          />
        </box>
      </box>
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
