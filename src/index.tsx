#!/usr/bin/env bun
import { TextAttributes, createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTheme } from "./themes.ts";
import { fuzzyMatch } from "./suggest.ts";
import {
  BUILT_IN_COMMANDS,
  getBuiltInCommandNames,
  getBuiltInDescription,
  MENTIONS,
} from "./commands.ts";
import type {
  Message,
  Session,
  AppSettings,
  CustomCommand,
  KeySpec,
  ThemeName,
  Action,
  InputMode,
  Prompt,
} from "./types.ts";
import {
  loadSettings,
  saveSettings,
  loadSessions,
  saveSessions,
  loadCustomCommands,
  saveCustomCommands,
  defaultSettings,
  defaultKeybindings,
} from "./storage.ts";
import {
  OPENAI_BASE_URL,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  AF_BRIDGE_BASE_URL,
  AF_MODEL,
  getAuthHeader,
  buildResponsesInput,
} from "./api.ts";
import { parseSSEStream } from "./sse.ts";
import { formatRequestInfoForDisplay } from "./af.ts";
import {
  handleClearCommand,
  handleHelpCommand,
  handleModelCommand,
  handleEndpointCommand,
  handleApiKeyCommand,
  handleSettingsCommand,
  handleSessionsCommand,
  handleStatusCommand,
  handleTerminalSetupCommand,
  handleCommandsCommand,
  handleThemeCommand,
  handleExportCommand,
  handleUnknownCommand,
  type CommandContext,
} from "./commandHandlers.ts";
import { formatMessageWithMentions } from "./mentionHandlers.ts";
import { createStdoutWithDimensions } from "./utils.ts";

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
    await parseSSEStream(reader, {
      onDelta,
      onError,
      onTraceComplete: (payload) => {
        const formatted = formatRequestInfoForDisplay(payload);
        if (formatted) {
          onDelta(formatted);
        }
      },
    });

    onDone();
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)));
    onDone();
  }
}

// Spinner frames for streaming indicator
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function App() {
  const renderer = useRenderer();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestStartAt, setRequestStartAt] = useState<number | null>(null);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("chat");
  type UISuggestion = { label: string; description?: string; kind: "command" | "custom-command" | "mention" };
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>(() =>
    loadCustomCommands()
  );
  const [showSessionList, setShowSessionList] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptInputValue, setPromptInputValue] = useState("");
  const scrollBoxRef = useRef<any>(null);

  const COLORS = useMemo(() => getTheme(settings.theme), [settings.theme]);

  const matchKey = useCallback((key: any, spec: KeySpec) => {
    return (
      key.name === spec.name &&
      (!!key.ctrl === !!spec.ctrl) &&
      (!!key.alt === !!spec.alt) &&
      (!!key.shift === !!spec.shift)
    );
  }, []);

  const keyFor = useCallback(
    (action: Action): KeySpec[] => settings.keybindings[action] || [],
    [settings.keybindings]
  );

  // Auto-scroll to bottom when new messages arrive or update
  useEffect(() => {
    if (scrollBoxRef.current && messages.length > 0) {
      // Always scroll to bottom when messages change
      setTimeout(() => {
        scrollBoxRef.current?.scrollToBottom?.();
      }, 0);
    }
  }, [messages]);

  // Streaming spinner
  useEffect(() => {
    let t: any;
    if (isProcessing) {
      t = setInterval(() => setSpinnerIndex((i) => (i + 1) % SPINNER_FRAMES.length), 80);
    }
    return () => t && clearInterval(t);
  }, [isProcessing]);

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

  // Initialize prompt input value when prompt opens
  useEffect(() => {
    if (prompt && prompt.type === "input") {
      setPromptInputValue(prompt.defaultValue || "");
    } else if (!prompt) {
      setPromptInputValue("");
    }
  }, [prompt]);

  // Command / mention detection + fuzzy suggestions
  useEffect(() => {
    if (input.startsWith("/")) {
      setInputMode("command");
      const query = input.slice(1);
      const customKeys = new Set(customCommands.map((c) => c.name));
      const items = [
        ...BUILT_IN_COMMANDS.map((c) => ({ key: c.name, description: c.description, keywords: c.keywords })),
        ...customCommands.map((c) => ({ key: c.name, description: c.description })),
      ];
      const matches = fuzzyMatch(query, items, 8);
      const mapped: UISuggestion[] = matches.map((m) => ({
        label: m.key,
        description: m.description || (customKeys.has(m.key) ? "Custom command" : getBuiltInDescription(m.key) || ""),
        kind: customKeys.has(m.key) ? "custom-command" : "command",
      }));
      setSuggestions(mapped);
      setSelectedSuggestionIndex(0);
    } else if (input.startsWith("@")) {
      setInputMode("mention");
      const query = input.slice(1);
      const items = MENTIONS.map((m) => ({ key: m.name, description: m.description }));
      const matches = fuzzyMatch(query, items, 8);
      const mapped: UISuggestion[] = matches.map((m) => ({ label: m.key, description: m.description, kind: "mention" }));
      setSuggestions(mapped);
      setSelectedSuggestionIndex(0);
    } else {
      setInputMode("chat");
      setSuggestions([]);
      setSelectedSuggestionIndex(0);
    }
  }, [input, customCommands]);

  useKeyboard((key) => {
    // If a prompt is open, handle Esc and Enter
    if (prompt) {
      if (key.name === "escape") {
        prompt.onCancel?.();
        setPrompt(null);
        setPromptInputValue("");
        return;
      }
      if (key.name === "enter" && prompt.type === "confirm") {
        prompt.onConfirm();
        setPrompt(null);
        setPromptInputValue("");
        return;
      }
      // For input type prompts, let the input component handle Enter
      if (prompt.type === "input") {
        return; // input component will handle enter via onSubmit
      }
    }

    // Settings overlay navigation
    if (showSettingsMenu) {
      if (key.name === "escape") {
        setShowSettingsMenu(false);
        return;
      }
      // Let settings overlay itself handle Up/Down via focused internal input if needed
      // Fall through to other handlers only if not handled
    }

    // Suggestions navigation via keybindings
    if (suggestions.length > 0) {
      const nextSpecs = keyFor("nextSuggestion");
      const prevSpecs = keyFor("prevSuggestion");
      const autoSpecs = keyFor("autocomplete");

      if (nextSpecs.some((s) => matchKey(key, s))) {
        setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (prevSpecs.some((s) => matchKey(key, s))) {
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (autoSpecs.some((s) => matchKey(key, s))) {
        const sel = suggestions[selectedSuggestionIndex];
        if (!sel) return;
        if (inputMode === "command") setInput(`/${sel.label}`);
        else if (inputMode === "mention") setInput(`@${sel.label}`);
        return;
      }
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
      return;
    }

    // Exit with Ctrl+C
    if (key.ctrl && key.name === "c") {
      renderer?.stop();
      return;
    }
  });

  const handleInput = useCallback((value: string) => {
    setInput(value);
  }, []);

  const executeCommand = useCallback(
    (command: string, args?: string) => {
      const cmd = command.toLowerCase();
      const context: CommandContext = {
        settings,
        sessions,
        messages,
        customCommands,
        currentSessionId,
        setSettings,
        setMessages,
        setPrompt,
        setPromptInputValue,
        setShowSettingsMenu,
        setShowSessionList,
      };

      let result: { systemMessage?: Message; shouldReturn?: boolean };

      switch (cmd) {
        case "clear":
          result = handleClearCommand(context);
          break;
        case "help":
          result = handleHelpCommand();
          break;
        case "model":
          result = handleModelCommand(args, context);
          break;
        case "endpoint":
          result = handleEndpointCommand(args, context);
          break;
        case "api-key":
          result = handleApiKeyCommand(args, context);
          break;
        case "settings":
          result = handleSettingsCommand(context);
          break;
        case "sessions":
          result = handleSessionsCommand(context);
          break;
        case "status":
          result = handleStatusCommand(context);
          break;
        case "terminal-setup":
          result = handleTerminalSetupCommand();
          break;
        case "commands":
          result = handleCommandsCommand(context);
          break;
        case "theme":
          result = handleThemeCommand(context);
          break;
        case "export":
          result = handleExportCommand(context);
          break;
        default:
          result = handleUnknownCommand(cmd, context);
      }

      if (result.shouldReturn) {
        return;
      }

      if (result.systemMessage) {
        setMessages((prev) => [...prev, result.systemMessage!]);
      }
    },
    [settings, sessions, messages, customCommands, currentSessionId, setSettings, setMessages, setPrompt, setPromptInputValue, setShowSettingsMenu, setShowSessionList]
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
        executeCommand(selected.label, "");
        setInput("");
        setSuggestions([]);
        setInputMode("chat");
        return;
      } else if (inputMode === "mention" && selected) {
        // For mentions, just complete the input
        setInput(`@${selected.label} `);
        setSuggestions([]);
        return;
      }
    }

    if (!input.trim()) return;

    // Handle commands entered manually
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

    // Format message with mentions if present
    const formattedInput = formatMessageWithMentions(input.trim());
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: formattedInput,
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
    setRequestStartAt(Date.now());

    // Build history for this turn (use current state + new user)
    const historyForApi = [...messages, userMessage];

// Route based on AF bridge configuration
    const useAf = !!settings.afBridgeBaseUrl && !!(settings.afModel || settings.model);

    if (useAf) {
      // Stream from AF bridge using model and optional conversation id
      const modelId = settings.afModel || settings.model || "workflow";
      streamResponseFromAFBridge({
        baseUrl: settings.afBridgeBaseUrl!,
        model: modelId,
        conversation: undefined, // optional: bind a conversation id here if desired
        input: input.trim(),
        onDelta: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m))
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: m.content + `\n\n[Error] ${err.message}` } : m
            )
          );
        },
        onDone: () => {
          setIsProcessing(false);
        },
      });
    } else {
      // Stream from OpenAI Responses API
      streamResponseFromOpenAI({
        history: historyForApi,
        onDelta: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m))
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: m.content + `\n\n[Error] ${err.message}` } : m
            )
          );
        },
        onDone: () => {
          setIsProcessing(false);
        },
      });
    }
  }, [input, isProcessing, inputMode, executeCommand, messages, suggestions, selectedSuggestionIndex]);

  // Show welcome screen if no messages
  const showWelcome = messages.length === 0;

  const elapsedSec = useMemo(() => {
    if (!requestStartAt || !isProcessing) return 0;
    return Math.max(0, Math.floor((Date.now() - requestStartAt) / 1000));
  }, [requestStartAt, isProcessing]);

  return (
    <box flexDirection="column" flexGrow={1} style={{ backgroundColor: COLORS.bg.primary }}>
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
        <text content="QLAW CLI" style={{ fg: COLORS.text.secondary, attributes: TextAttributes.DIM }} />
        <text content="" style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM }} />
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
                <text
                  content="QLAW CLI"
                  style={{ fg: COLORS.text.primary, attributes: TextAttributes.BOLD, marginBottom: 1 }}
                />
                <text
                  content={`${process.cwd().replace(process.env.HOME || "", "~")}`}
                  style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM, marginBottom: 1 }}
                />
                <text
                  content="SessionStart:Callback hook succeeded: Success"
                  style={{ fg: COLORS.text.tertiary, attributes: TextAttributes.DIM }}
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
                  style={{ fg: COLORS.text.accent, attributes: TextAttributes.BOLD, marginBottom: 1 }}
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
                style={{ marginBottom: index < messages.length - 1 ? 3 : 0, flexDirection: "column" }}
              >
                {/* Message Header with Icon */}
                <box style={{ marginBottom: 1 }}>
                  <text content="> " style={{ fg: COLORS.text.secondary }} />
                  <text
                    content={
                      message.role === "user"
                        ? message.content.substring(0, 80)
                        : message.role === "system"
                        ? "System"
                        : `Assistant${isProcessing && index === messages.length - 1 ? " " + SPINNER_FRAMES[spinnerIndex] : ""}`
                    }
                    style={{ fg: COLORS.text.primary }}
                  />
                </box>

                {/* Message Content */}
                <text
                  content={message.content}
                  style={{ fg: COLORS.text.primary }}
                />
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
            <text content="Sessions" style={{ fg: COLORS.text.accent, attributes: TextAttributes.BOLD, marginBottom: 1 }} />
            {sessions.length === 0 ? (
              <text content="No saved sessions" style={{ fg: COLORS.text.tertiary }} />
            ) : (
              sessions.slice(-5).map((session, idx) => (
                <text
                  key={session.id}
                  content={`${idx + 1}. ${session.name} (${session.messages.length} msgs, ${new Date(session.updatedAt).toLocaleDateString()})`}
                  style={{ fg: COLORS.text.secondary, marginTop: 1 }}
                />
              ))
            )}
            <text content="\nPress ESC to close" style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM, marginTop: 1 }} />
          </box>
        </box>
      )}

      {/* Prompt Overlay */}
      {prompt && (
        <box
          style={{
            position: "absolute",
            top: 7,
            left: 12,
            right: 12,
            backgroundColor: COLORS.bg.panel,
            border: true,
            borderColor: COLORS.border,
            padding: 2,
            zIndex: 200,
          }}
        >
          <box flexDirection="column" style={{ width: "100%" }}>
            <text content={prompt.message} style={{ fg: COLORS.text.secondary, marginBottom: 1 }} />
            {prompt.type === "input" ? (
              <box
                style={{
                  border: true,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.bg.primary,
                  paddingLeft: 1,
                  paddingRight: 1,
                  paddingTop: 1,
                  paddingBottom: 1,
                  marginTop: 1,
                }}
              >
                <input
                  placeholder={prompt.placeholder || "Type and press Enter"}
                  value={promptInputValue}
                  onInput={(v: string) => setPromptInputValue(v)}
                  onSubmit={() => {
                    prompt.onConfirm(promptInputValue);
                    setPromptInputValue("");
                  }}
                  focused={true}
                  style={{ flexGrow: 1, backgroundColor: COLORS.bg.primary, focusedBackgroundColor: COLORS.bg.primary }}
                />
              </box>
            ) : (
              <text
                content="Press Enter to confirm · Esc to cancel"
                style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM, marginTop: 1 }}
              />
            )}
          </box>
        </box>
      )}

      {/* Settings Menu Overlay (read-only summary for now) */}
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
            <text content="Settings" style={{ fg: COLORS.text.accent, attributes: TextAttributes.BOLD, marginBottom: 1 }} />
            <text content={`Model: ${settings.model || "Not set"}`} style={{ fg: COLORS.text.secondary, marginTop: 1 }} />
            <text content={`Endpoint: ${settings.endpoint || "Not set"}`} style={{ fg: COLORS.text.secondary, marginTop: 1 }} />
            <text content={`API Key: ${settings.apiKey ? "***" + settings.apiKey.slice(-4) : "Not set"}`} style={{ fg: COLORS.text.secondary, marginTop: 1 }} />
            <text content={`Theme: ${settings.theme}`} style={{ fg: COLORS.text.secondary, marginTop: 1 }} />
            <text content={`Timestamps: ${settings.showTimestamps ? "Shown" : "Hidden"}`} style={{ fg: COLORS.text.secondary, marginTop: 1 }} />
            <text content={`Auto-scroll: ${settings.autoScroll ? "Enabled" : "Disabled"}`} style={{ fg: COLORS.text.secondary, marginTop: 1 }} />
            <text content="\nUse /model, /endpoint, /api-key, /theme, /status to change settings\nPress ESC to close" style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM, marginTop: 2 }} />
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
          minHeight: 5,
          flexShrink: 0,
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
            {suggestions.map((s, index) => {
              const isSelected = index === selectedSuggestionIndex;
              const prefix = inputMode === "command" ? "/" : "@";
              return (
                <box
                  key={`${s.kind}:${s.label}`}
                  style={{
                    paddingLeft: 1,
                    paddingRight: 1,
                    backgroundColor: isSelected ? COLORS.bg.hover : "transparent",
                    marginTop: index > 0 ? 1 : 0,
                  }}
                >
                  <text
                    content={`${prefix}${s.label}`}
                    style={{
                      fg: isSelected ? COLORS.text.accent : COLORS.text.secondary,
                      attributes: isSelected ? TextAttributes.BOLD : 0,
                      width: 24,
                    }}
                  />
                  <text
                    content={s.description || ""}
                    style={{ fg: COLORS.text.tertiary, attributes: TextAttributes.DIM, marginLeft: 2 }}
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
            minHeight: 3,
            flexShrink: 0,
          }}
        >
          <text content="> " style={{ fg: COLORS.text.secondary }} />
          <input
            placeholder={
              inputMode === "command"
                ? "Type command name..."
                : inputMode === "mention"
                ? "Select mention type..."
                : "Write a message…"
            }
            value={input}
            onInput={handleInput}
            onSubmit={handleSubmit}
            focused={!isProcessing && !showSessionList && !showSettingsMenu && !prompt}
            style={{ flexGrow: 1, backgroundColor: COLORS.bg.panel, focusedBackgroundColor: COLORS.bg.panel }}
          />
        </box>

        {/* Status Line */}
        <box style={{ justifyContent: "space-between", alignItems: "center" }}>
          <text
            content={
              isProcessing
                ? `Warping... (esc to interrupt · ${elapsedSec}s)`
                : suggestions.length > 0
                ? "↑↓ navigate · tab autocomplete · enter submit"
                : "? for shortcuts"
            }
            style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM }}
          />
          <text content={isProcessing ? "Streaming..." : ""} style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM }} />
        </box>
      </box>
    </box>
  );
}

// --- AF bridge helpers ---
async function streamResponseFromAFBridge(params: {
  baseUrl: string;
  model: string;
  conversation?: string | { id: string };
  input: string;
  onDelta: (text: string) => void;
  onError: (err: Error) => void;
  onDone: () => void;
}) {
  const { baseUrl, model, conversation, input, onDelta, onError, onDone } = params;
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/v1/responses`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ model, input, stream: true, ...(conversation ? { conversation } : {}) }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
    }
    const reader = res.body.getReader();
    await parseSSEStream(reader, {
      onDelta,
      onError,
      onTraceComplete: (payload) => {
        const formatted = formatRequestInfoForDisplay(payload);
        if (formatted) {
          onDelta(formatted);
        }
      },
    });
    onDone();
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)));
    onDone();
  }
}

// Setup terminal with dimensions
const stdoutWithDimensions = createStdoutWithDimensions();

const renderer = await createCliRenderer({ stdout: stdoutWithDimensions });
createRoot(renderer).render(<App />);
