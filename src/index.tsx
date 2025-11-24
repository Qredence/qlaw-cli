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
  UISuggestion,
} from "./types.ts";
import {
  loadSettings,
  saveSettings,
  loadSessions,
  saveSessions,
  loadCustomCommands,
  saveCustomCommands,
  debouncedSaveSettings,
  debouncedSaveSessions,
  debouncedSaveCustomCommands,
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
  handleExitCommand,
  handlePwdCommand,
  handleCwdCommand,
  handleUnknownCommand,
  handleModeCommand,
  handleWorkflowCommand,
  handleAgentsCommand,
  handleRunCommand,
  handleContinueCommand,
  handleJudgeCommand,
  handleAfBridgeCommand,
  handleAfModelCommand,
  handleKeybindingsCommand,
  type CommandContext,
} from "./commandHandlers.ts";
import { formatMessageWithMentions } from "./mentionHandlers.ts";
import { createStdoutWithDimensions } from "./utils.ts";
import { startWorkflow } from "./workflow.ts";
import { SessionList } from "./components/SessionList.tsx";
import { SettingsMenu } from "./components/SettingsMenu.tsx";
import { Header } from "./components/Header.tsx";
import { MessageList } from "./components/MessageList.tsx";
import { InputArea } from "./components/InputArea.tsx";
import { WelcomeScreen } from "./components/WelcomeScreen.tsx";
import { SuggestionList } from "./components/SuggestionList.tsx";

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
  const [mode, setMode] = useState<"standard" | "workflow">("standard");

  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionScrollOffset, setSuggestionScrollOffset] = useState(0);
  const MAX_VISIBLE_SUGGESTIONS = 8;
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>(() =>
    loadCustomCommands()
  );
  const [showSessionList, setShowSessionList] = useState(false);
  const [sessionFocusIndex, setSessionFocusIndex] = useState(0);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsFocusIndex, setSettingsFocusIndex] = useState(0);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptInputValue, setPromptInputValue] = useState("");
  const scrollBoxRef = useRef<any>(null);

  const COLORS = useMemo(() => getTheme(settings.theme), [settings.theme]);

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
  }, [sessions]);

  // Memoize command items list to avoid recreating on every input change
  const commandItems = useMemo(() => {
    return [
      ...BUILT_IN_COMMANDS.map((c) => ({
        key: c.name,
        description: c.description,
        keywords: c.keywords,
      })),
      ...customCommands.map((c) => ({
        key: c.name,
        description: c.description,
      })),
    ];
  }, [customCommands]);

  // Memoize custom command names set for faster lookups
  const customCommandNames = useMemo(
    () => new Set(customCommands.map((c) => c.name)),
    [customCommands]
  );

  // Memoize mention items list (static, but good to memoize for consistency)
  const mentionItems = useMemo(() => {
    return MENTIONS.map((m) => ({
      key: m.name,
      description: m.description,
    }));
  }, []);

  type StringSettingKey = keyof Pick<
    AppSettings,
    "model" | "endpoint" | "apiKey" | "afBridgeBaseUrl" | "afModel"
  >;

  const setStringSetting = useCallback(
    (key: StringSettingKey, value: string | undefined) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setSettings]
  );

  const openSettingPrompt = useCallback(
    (options: {
      title: string;
      currentValue?: string;
      placeholder?: string;
      onSubmit: (value: string | undefined) => void;
    }) => {
      setPrompt({
        type: "input",
        message: options.title,
        defaultValue: options.currentValue || "",
        placeholder: options.placeholder,
        onConfirm: (val: string) => {
          const trimmed = val.trim();
          options.onSubmit(trimmed ? trimmed : undefined);
          setPrompt(null);
        },
        onCancel: () => setPrompt(null),
      });
    },
    [setPrompt]
  );

  const settingsSections = useMemo(() => {
    const workflowEnabled = settings.workflow?.enabled ?? false;
    const maskedKey = settings.apiKey
      ? "***" + settings.apiKey.slice(-4)
      : "Not set";
    return [
      {
        title: "Core API",
        items: [
          {
            id: "model",
            label: "Model",
            value: settings.model || "Not set",
            description: "Default model for OpenAI Responses mode",
            type: "text" as const,
            onActivate: () =>
              openSettingPrompt({
                title: "Enter default model",
                currentValue: settings.model,
                placeholder: "gpt-4o-mini",
                onSubmit: (value) => setStringSetting("model", value),
              }),
          },
          {
            id: "endpoint",
            label: "Endpoint",
            value: settings.endpoint || "Not set",
            description: "Base URL for OpenAI / Azure Responses API",
            type: "text" as const,
            onActivate: () =>
              openSettingPrompt({
                title: "Enter API endpoint base URL",
                currentValue: settings.endpoint,
                placeholder: "https://api.openai.com/v1",
                onSubmit: (value) => setStringSetting("endpoint", value),
              }),
          },
          {
            id: "apiKey",
            label: "API Key",
            value: maskedKey,
            description: "Stored locally at ~/.qlaw-cli/qlaw_settings.json",
            type: "text" as const,
            onActivate: () =>
              openSettingPrompt({
                title: "Enter API key",
                currentValue: settings.apiKey,
                placeholder: "sk-...",
                onSubmit: (value) => setStringSetting("apiKey", value),
              }),
          },
        ],
      },
      {
        title: "UI",
        items: [
          {
            id: "theme",
            label: "Theme",
            value: settings.theme === "dark" ? "Dark" : "Light",
            description: "Toggle dark/light palette",
            type: "toggle" as const,
            onActivate: () =>
              setSettings((prev) => ({
                ...prev,
                theme: prev.theme === "dark" ? "light" : "dark",
              })),
          },
          {
            id: "timestamps",
            label: "Timestamps",
            value: settings.showTimestamps ? "Shown" : "Hidden",
            description: "Toggle message timestamps",
            type: "toggle" as const,
            onActivate: () =>
              setSettings((prev) => ({
                ...prev,
                showTimestamps: !prev.showTimestamps,
              })),
          },
          {
            id: "autoscroll",
            label: "Auto-scroll",
            value: settings.autoScroll ? "Enabled" : "Disabled",
            description: "Scroll to bottom when streaming",
            type: "toggle" as const,
            onActivate: () =>
              setSettings((prev) => ({
                ...prev,
                autoScroll: !prev.autoScroll,
              })),
          },
        ],
      },
      {
        title: "Agent Framework",
        items: [
          {
            id: "afBridgeBaseUrl",
            label: "Bridge URL",
            value: settings.afBridgeBaseUrl || "Not set",
            description: "FastAPI bridge for agent-framework workflows",
            type: "text" as const,
            onActivate: () =>
              openSettingPrompt({
                title: "Enter Agent Framework bridge base URL",
                currentValue: settings.afBridgeBaseUrl,
                placeholder: "http://127.0.0.1:8081",
                onSubmit: (value) => setStringSetting("afBridgeBaseUrl", value),
              }),
          },
          {
            id: "afModel",
            label: "AF Model",
            value: settings.afModel || settings.model || "Not set",
            description: "Workflow / fleet identifier exposed by the bridge",
            type: "text" as const,
            onActivate: () =>
              openSettingPrompt({
                title: "Enter Agent Framework model identifier",
                currentValue: settings.afModel,
                placeholder: "multi_tier_support",
                onSubmit: (value) => setStringSetting("afModel", value),
              }),
          },
          {
            id: "workflowEnabled",
            label: "Workflow mode",
            value: workflowEnabled ? "Enabled" : "Disabled",
            description: "When enabled, workflow mode stays active by default",
            type: "toggle" as const,
            onActivate: () =>
              setSettings((prev) => ({
                ...prev,
                workflow: {
                  ...(prev.workflow || {}),
                  enabled: !(prev.workflow?.enabled ?? false),
                },
              })),
          },
        ],
      },
    ];
  }, [settings, openSettingPrompt, setSettings, setStringSetting]);

  const flatSettingsItems = useMemo(
    () => settingsSections.flatMap((section) => section.items),
    [settingsSections]
  );

  const handleSettingsItemActivate = useCallback(() => {
    const target = flatSettingsItems[settingsFocusIndex];
    if (target?.onActivate) {
      target.onActivate();
    }
  }, [flatSettingsItems, settingsFocusIndex]);

  const handleSessionActivate = useCallback(() => {
    const target = recentSessions[sessionFocusIndex];
    if (!target) return;
    const resumedMessages = target.messages.map((message) => ({ ...message }));
    resumedMessages.push({
      id: `${target.id}-resume-${Date.now()}`,
      role: "system",
      content: `Resumed session "${target.name}" (${target.messages.length} messages).`,
      timestamp: new Date(),
    });
    setMessages(resumedMessages);
    setCurrentSessionId(target.id);
    setShowSessionList(false);
  }, [
    recentSessions,
    sessionFocusIndex,
    setMessages,
    setCurrentSessionId,
    setShowSessionList,
  ]);

  const matchKey = useCallback((key: any, spec: KeySpec) => {
    return (
      key.name === spec.name &&
      !!key.ctrl === !!spec.ctrl &&
      !!key.alt === !!spec.alt &&
      !!key.shift === !!spec.shift
    );
  }, []);

  const keyFor = useCallback(
    (action: Action): KeySpec[] => settings.keybindings[action] || [],
    [settings.keybindings]
  );

  const suggestionFooter = useMemo(() => {
    if (inputMode === "command")
      return "↑↓ navigate · tab autocomplete · enter run";
    if (inputMode === "mention")
      return "↑↓ navigate · tab autocomplete · enter insert";
    return "";
  }, [inputMode]);

  const inputPlaceholder = useMemo(() => {
    if (inputMode === "command") return "Type a command name…";
    if (inputMode === "mention") return "Select a mention type…";
    return mode === "workflow"
      ? "Guide your agents…  (type / for commands · @ for context)"
      : "Ask a question…  (type / for commands · @ for context)";
  }, [inputMode, mode]);

  const inputHint = useMemo(() => {
    if (inputMode === "command")
      return "↩ enter to run · tab autocomplete · esc cancel";
    if (inputMode === "mention")
      return "↑↓ choose mention · tab autocomplete · enter insert";
    return "enter send · shift+enter newline · esc clear";
  }, [inputMode]);

  const inputBorderColor = useMemo(() => {
    if (inputMode === "command") return COLORS.text.accent;
    if (inputMode === "mention") return COLORS.text.tertiary;
    return COLORS.border;
  }, [inputMode, COLORS]);

  const showSuggestionPanel = inputMode !== "chat";
  const inputAreaMinHeight = showSuggestionPanel ? 9 : 4;
  const inputAreaPaddingTop = showSuggestionPanel ? 1 : 0;

  // Auto-scroll to bottom when new messages arrive if enabled
  useEffect(() => {
    if (scrollBoxRef.current && messages.length > 0 && settings.autoScroll) {
      setTimeout(() => {
        scrollBoxRef.current?.scrollToBottom?.();
      }, 0);
    }
  }, [messages, settings.autoScroll]);

  // Streaming spinner
  useEffect(() => {
    let t: any;
    if (isProcessing) {
      t = setInterval(
        () => setSpinnerIndex((i) => (i + 1) % SPINNER_FRAMES.length),
        80
      );
    }
    return () => t && clearInterval(t);
  }, [isProcessing]);

  // Save settings when changed (debounced to reduce file I/O)
  useEffect(() => {
    debouncedSaveSettings(settings);
  }, [settings]);

  // Save sessions when changed (debounced to reduce file I/O)
  useEffect(() => {
    debouncedSaveSessions(sessions);
  }, [sessions]);

  // Save custom commands when changed (debounced to reduce file I/O)
  useEffect(() => {
    debouncedSaveCustomCommands(customCommands);
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
      const matches = fuzzyMatch(query, commandItems, commandItems.length);
      const mapped: UISuggestion[] = matches.map((m) => ({
        label: m.key,
        description:
          m.description ||
          (customCommandNames.has(m.key)
            ? "Custom command"
            : getBuiltInDescription(m.key) || ""),
        kind: customCommandNames.has(m.key) ? "custom-command" : "command",
      }));
      setSuggestions(mapped);
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
    } else if (input.startsWith("@")) {
      setInputMode("mention");
      const query = input.slice(1);
      const matches = fuzzyMatch(query, mentionItems, mentionItems.length);
      const mapped: UISuggestion[] = matches.map((m) => ({
        label: m.key,
        description: m.description,
        kind: "mention",
      }));
      setSuggestions(mapped);
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
    } else {
      setInputMode("chat");
      setSuggestions([]);
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
    }
  }, [input, commandItems, customCommandNames, mentionItems]);

  useEffect(() => {
    if (selectedSuggestionIndex < suggestionScrollOffset) {
      setSuggestionScrollOffset(selectedSuggestionIndex);
    } else if (
      selectedSuggestionIndex >=
      suggestionScrollOffset + MAX_VISIBLE_SUGGESTIONS
    ) {
      setSuggestionScrollOffset(
        selectedSuggestionIndex - MAX_VISIBLE_SUGGESTIONS + 1
      );
    }
  }, [
    selectedSuggestionIndex,
    suggestionScrollOffset,
    MAX_VISIBLE_SUGGESTIONS,
  ]);

  useEffect(() => {
    const maxOffset = Math.max(0, suggestions.length - MAX_VISIBLE_SUGGESTIONS);
    setSuggestionScrollOffset((prev) => Math.min(prev, maxOffset));
  }, [suggestions.length, MAX_VISIBLE_SUGGESTIONS]);

  useEffect(() => {
    if (showSessionList) {
      setSessionFocusIndex(0);
    }
  }, [showSessionList]);

  useEffect(() => {
    if (!showSessionList) return;
    if (recentSessions.length === 0) {
      setSessionFocusIndex(0);
      return;
    }
    setSessionFocusIndex((prev) => Math.min(prev, recentSessions.length - 1));
  }, [showSessionList, recentSessions.length]);

  useEffect(() => {
    if (showSettingsMenu) {
      setSettingsFocusIndex(0);
    }
  }, [showSettingsMenu]);

  useEffect(() => {
    if (!showSettingsMenu) return;
    if (flatSettingsItems.length === 0) return;
    setSettingsFocusIndex((prev) =>
      Math.min(prev, Math.max(0, flatSettingsItems.length - 1))
    );
  }, [showSettingsMenu, flatSettingsItems.length]);

  useKeyboard((key) => {
    if (showSessionList) {
      if (key.name === "escape") {
        setShowSessionList(false);
        return;
      }
      if (recentSessions.length > 0) {
        if (key.name === "down" || (key.name === "tab" && !key.shift)) {
          setSessionFocusIndex((prev) => (prev + 1) % recentSessions.length);
          return;
        }
        if (key.name === "up" || (key.name === "tab" && key.shift)) {
          setSessionFocusIndex(
            (prev) => (prev - 1 + recentSessions.length) % recentSessions.length
          );
          return;
        }
      }
      if (key.name === "enter" || key.name === "return") {
        handleSessionActivate();
        return;
      }
      // Block other keystrokes while overlay is focused
      return;
    }

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
      if (flatSettingsItems.length > 0) {
        if (key.name === "down" || (key.name === "tab" && !key.shift)) {
          setSettingsFocusIndex(
            (prev) => (prev + 1) % flatSettingsItems.length
          );
          return;
        }
        if (key.name === "up" || (key.name === "tab" && key.shift)) {
          setSettingsFocusIndex(
            (prev) =>
              (prev - 1 + flatSettingsItems.length) % flatSettingsItems.length
          );
          return;
        }
      }
      if (
        key.name === "enter" ||
        key.name === "return" ||
        key.name === "space"
      ) {
        handleSettingsItemActivate();
        return;
      }
    }

    // Suggestions navigation via keybindings
    if (suggestions.length > 0) {
      const nextSpecs = keyFor("nextSuggestion");
      const prevSpecs = keyFor("prevSuggestion");
      const autoSpecs = keyFor("autocomplete");

      if (nextSpecs.some((s) => matchKey(key, s))) {
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (prevSpecs.some((s) => matchKey(key, s))) {
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
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

    // Toggle mode with Ctrl+M
    if (key.ctrl && key.name === "m") {
      setMode((prev) => (prev === "standard" ? "workflow" : "standard"));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: `Mode toggled to: ${
            mode === "standard" ? "workflow" : "standard"
          }`,
          timestamp: new Date(),
        },
      ]);
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
        setMode,
      };

      let result: { systemMessage?: Message; shouldReturn?: boolean };

      switch (cmd) {
        case "clear":
          result = handleClearCommand(context, args);
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
        case "af-bridge":
          result = handleAfBridgeCommand(args, context);
          break;
        case "af-model":
          result = handleAfModelCommand(args, context);
          break;
        case "keybindings":
          result = handleKeybindingsCommand(args, context);
          break;
        case "settings":
          result = handleSettingsCommand(args, context);
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
        case "exit":
        case "quit":
          context.stop = () => renderer?.stop();
          result = handleExitCommand(context);
          break;
        case "pwd":
          result = handlePwdCommand();
          break;
        case "cwd":
          result = handleCwdCommand(args);
          break;
        case "mode":
          result = handleModeCommand(args, context);
          break;
        case "workflow":
          result = handleWorkflowCommand();
          break;
        case "agents":
          result = handleAgentsCommand();
          break;
        case "run":
          result = handleRunCommand();
          break;
        case "continue":
          result = handleContinueCommand();
          break;
        case "judge":
          result = handleJudgeCommand();
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
    [
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
    ]
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
    const useAf =
      mode === "workflow" &&
      !!settings.afBridgeBaseUrl &&
      !!(settings.afModel || settings.model);

    if (useAf) {
      const modelId = settings.afModel || settings.model || "workflow";
      startWorkflow({
        baseUrl: settings.afBridgeBaseUrl!,
        model: modelId,
        conversation: undefined,
        input: input.trim(),
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
    } else {
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
    }
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

  const elapsedSec = useMemo(() => {
    if (!requestStartAt || !isProcessing) return 0;
    return Math.max(0, Math.floor((Date.now() - requestStartAt) / 1000));
  }, [requestStartAt, isProcessing]);

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      style={{ backgroundColor: COLORS.bg.primary }}
    >
      {/* Header */}
      <Header
        mode={mode}
        bridgeUrl={settings.afBridgeBaseUrl}
        colors={COLORS}
      />

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
          <WelcomeScreen
            cwd={process.cwd().replace(process.env.HOME || "", "~")}
            colors={COLORS}
          />
        ) : (
          <MessageList
            messages={messages}
            isProcessing={isProcessing}
            spinnerFrame={SPINNER_FRAMES[spinnerIndex] || ""}
            colors={COLORS}
          />
        )}
      </scrollbox>

      {/* Session List Overlay */}
      {showSessionList && (
        <SessionList
          sessions={sessions}
          recentSessions={recentSessions}
          focusIndex={sessionFocusIndex}
          colors={COLORS}
        />
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
            <text
              content={prompt.message}
              style={{ fg: COLORS.text.secondary, marginBottom: 1 }}
            />
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
                  style={{
                    flexGrow: 1,
                    backgroundColor: COLORS.bg.primary,
                    focusedBackgroundColor: COLORS.bg.primary,
                  }}
                />
              </box>
            ) : (
              <text
                content="Press Enter to confirm · Esc to cancel"
                style={{
                  fg: COLORS.text.dim,
                  attributes: TextAttributes.DIM,
                  marginTop: 1,
                }}
              />
            )}
          </box>
        </box>
      )}

      {showSettingsMenu && (
        <SettingsMenu
          sections={settingsSections}
          focusIndex={settingsFocusIndex}
          colors={COLORS}
        />
      )}

      {/* Input Area */}
      <box
        style={{
          backgroundColor: COLORS.bg.primary,
          border: true,
          borderColor: COLORS.border,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: inputAreaPaddingTop,
          paddingBottom: 0,
          flexDirection: "column",
          minHeight: inputAreaMinHeight,
          flexShrink: 0,
        }}
      >
        {/* Command/Mention Suggestions Dropdown */}
        {showSuggestionPanel && (
          <SuggestionList
            suggestions={suggestions}
            selectedIndex={selectedSuggestionIndex}
            scrollOffset={suggestionScrollOffset}
            inputMode={inputMode}
            input={input}
            colors={COLORS}
            maxVisible={MAX_VISIBLE_SUGGESTIONS}
          />
        )}

        {/* Input Field */}
        <InputArea
          input={input}
          inputMode={inputMode}
          isProcessing={isProcessing}
          placeholder={inputPlaceholder}
          hint={inputHint}
          colors={COLORS}
          onInput={handleInput}
          onSubmit={handleSubmit}
        />

        {/* Status Line */}
        <box style={{ justifyContent: "space-between", alignItems: "center" }}>
          <text
            content={(() => {
              if (isProcessing)
                return `Warping... (esc to interrupt · ${elapsedSec}s)`;
              if (showSuggestionPanel) return suggestionFooter;
              const bridgePart =
                mode === "workflow"
                  ? settings.afBridgeBaseUrl
                    ? "Workflow · AF bridge ready"
                    : "Workflow · AF bridge not set"
                  : "Standard";
              return `Mode: ${bridgePart} · Theme: ${settings.theme} · /help for tips`;
            })()}
            style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM }}
          />
          <text
            content={
              isProcessing
                ? "Streaming..."
                : mode === "workflow"
                ? "@agents enabled"
                : ""
            }
            style={{ fg: COLORS.text.dim, attributes: TextAttributes.DIM }}
          />
        </box>
      </box>
    </box>
  );
}

// Setup terminal with dimensions
const stdoutWithDimensions = createStdoutWithDimensions();

const renderer = await createCliRenderer({ stdout: stdoutWithDimensions });
createRoot(renderer).render(<App />);
