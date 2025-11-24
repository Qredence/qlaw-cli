#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot, useRenderer } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTheme } from "./themes.ts";
import type { Message, Prompt } from "./types.ts";
import { useAppState } from "./hooks/useAppState.ts";
import { useInputMode } from "./hooks/useInputMode.ts";
import { useStreaming } from "./hooks/useStreaming.ts";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.ts";
import { useSettings } from "./hooks/useSettings.ts";
import { useSessions } from "./hooks/useSessions.ts";
import { executeCommand } from "./services/commandService.ts";
import { formatMessageWithMentions } from "./mentionHandlers.ts";
import { createStdoutWithDimensions } from "./utils.ts";
import { SessionList } from "./components/SessionList.tsx";
import { SettingsMenu } from "./components/SettingsMenu.tsx";
import { Header } from "./components/Header.tsx";
import { MessageList } from "./components/MessageList.tsx";
import { InputArea } from "./components/InputArea.tsx";
import { WelcomeScreen } from "./components/WelcomeScreen.tsx";
import { SuggestionList } from "./components/SuggestionList.tsx";
import { PromptOverlay } from "./components/PromptOverlay.tsx";
import { StatusLine } from "./components/StatusLine.tsx";

const MAX_VISIBLE_SUGGESTIONS = 8;

function App() {
  const renderer = useRenderer();
  const scrollBoxRef = useRef<any>(null);

  // Core application state
  const appState = useAppState();
  const {
    messages,
    setMessages,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    settings,
    setSettings,
    customCommands,
    setCustomCommands,
    recentSessions,
  } = appState;

  // Input mode and suggestions
  const inputMode = useInputMode({ customCommands });
  const {
    input,
    setInput,
    inputMode: currentInputMode,
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    suggestionScrollOffset,
    showSuggestionPanel,
    inputAreaMinHeight,
    inputAreaPaddingTop,
  } = inputMode;

  // Streaming state
  const streaming = useStreaming();
  const {
    isProcessing,
    spinnerFrame,
    elapsedSec,
    streamResponse,
  } = streaming;

  // Mode state
  const [mode, setMode] = useState<"standard" | "workflow">("standard");

  // Prompt state
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptInputValue, setPromptInputValue] = useState("");

  // Settings management
  const settingsHook = useSettings({
    settings,
    setSettings,
    setPrompt,
  });
  const {
    showSettingsMenu,
    setShowSettingsMenu,
    settingsFocusIndex,
    setSettingsFocusIndex,
    settingsSections,
    flatSettingsItems,
    handleSettingsItemActivate,
  } = settingsHook;

  // Sessions management
  const sessionsHook = useSessions({
    recentSessions,
    setMessages,
    setCurrentSessionId,
  });
  const {
    showSessionList,
    setShowSessionList,
    sessionFocusIndex,
    setSessionFocusIndex,
    handleSessionActivate,
  } = sessionsHook;

  // Theme
  const COLORS = useMemo(() => getTheme(settings.theme), [settings.theme]);

  // Initialize prompt input value when prompt opens
  useEffect(() => {
    if (prompt && prompt.type === "input") {
      setPromptInputValue(prompt.defaultValue || "");
    } else if (!prompt) {
      setPromptInputValue("");
    }
  }, [prompt]);

  // Auto-scroll to bottom when new messages arrive if enabled
  useEffect(() => {
    if (scrollBoxRef.current && messages.length > 0 && settings.autoScroll) {
      setTimeout(() => {
        scrollBoxRef.current?.scrollToBottom?.();
      }, 0);
    }
  }, [messages, settings.autoScroll]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    showSessionList,
    setShowSessionList,
    showSettingsMenu,
    setShowSettingsMenu,
    prompt,
    setPrompt,
    setPromptInputValue,
    recentSessions,
    sessionFocusIndex,
    setSessionFocusIndex,
    handleSessionActivate,
    flatSettingsItems,
    settingsFocusIndex,
    setSettingsFocusIndex,
    handleSettingsItemActivate,
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    inputMode: currentInputMode,
    setInput,
    mode,
    setMode,
    setMessages,
    settings,
  });

  // Command execution
  const handleExecuteCommand = useCallback(
    (command: string, args?: string) => {
      const result = executeCommand(command, args, {
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
        stop: () => renderer?.stop(),
      });

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
      setMode,
      renderer,
    ]
  );

  // Input submission handler
  const handleSubmit = useCallback(() => {
    if (isProcessing) return;

    // If suggestions are visible, select the highlighted suggestion
    if (
      suggestions.length > 0 &&
      (currentInputMode === "command" || currentInputMode === "mention")
    ) {
      const selected = suggestions[selectedSuggestionIndex];
      if (currentInputMode === "command" && selected) {
        handleExecuteCommand(selected.label, "");
        setInput("");
        return;
      } else if (currentInputMode === "mention" && selected) {
        setInput(`@${selected.label} `);
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
        handleExecuteCommand(cmd, args);
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

    // Build history for this turn
    const historyForApi = [...messages, userMessage];

    // Stream response
    streamResponse({
      messages: historyForApi,
      userInput: input.trim(),
      mode,
      settings,
      assistantMessageId,
      onMessageUpdate: setMessages,
    });
  }, [
    isProcessing,
    suggestions,
    selectedSuggestionIndex,
    currentInputMode,
    input,
    handleExecuteCommand,
    setInput,
    setMessages,
    messages,
    mode,
    settings,
    streamResponse,
  ]);

  // Computed values
  const showWelcome = messages.length === 0;

  const suggestionFooter = useMemo(() => {
    if (currentInputMode === "command")
      return "↑↓ navigate · tab autocomplete · enter run";
    if (currentInputMode === "mention")
      return "↑↓ navigate · tab autocomplete · enter insert";
    return "";
  }, [currentInputMode]);

  const inputPlaceholder = useMemo(() => {
    if (currentInputMode === "command") return "Type a command name…";
    if (currentInputMode === "mention") return "Select a mention type…";
    return mode === "workflow"
      ? "Guide your agents…  (type / for commands · @ for context)"
      : "Ask a question…  (type / for commands · @ for context)";
  }, [currentInputMode, mode]);

  const inputHint = useMemo(() => {
    if (currentInputMode === "command")
      return "↩ enter to run · tab autocomplete · esc cancel";
    if (currentInputMode === "mention")
      return "↑↓ choose mention · tab autocomplete · enter insert";
    return "enter send · shift+enter newline · esc clear";
  }, [currentInputMode]);

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
            spinnerFrame={spinnerFrame}
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
        <PromptOverlay
          prompt={prompt}
          promptInputValue={promptInputValue}
          onInputChange={setPromptInputValue}
          onConfirm={() => {
            prompt.onConfirm(promptInputValue);
            setPromptInputValue("");
          }}
          colors={COLORS}
        />
      )}

      {/* Settings Menu */}
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
            inputMode={currentInputMode}
            input={input}
            colors={COLORS}
            maxVisible={MAX_VISIBLE_SUGGESTIONS}
          />
        )}

        {/* Input Field */}
        <InputArea
          input={input}
          inputMode={currentInputMode}
          isProcessing={isProcessing}
          placeholder={inputPlaceholder}
          hint={inputHint}
          colors={COLORS}
          onInput={setInput}
          onSubmit={handleSubmit}
        />

        {/* Status Line */}
        <StatusLine
          isProcessing={isProcessing}
          elapsedSec={elapsedSec}
          mode={mode}
          settings={settings}
          inputMode={currentInputMode}
          suggestionFooter={suggestionFooter}
          colors={COLORS}
        />
      </box>
    </box>
  );
}

// Setup terminal with dimensions
const stdoutWithDimensions = createStdoutWithDimensions();

const renderer = await createCliRenderer({ stdout: stdoutWithDimensions });
createRoot(renderer).render(<App />);
