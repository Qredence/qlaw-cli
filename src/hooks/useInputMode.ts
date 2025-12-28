/**
 * Hook for managing input mode and suggestions
 * Handles command/mention detection and suggestion generation
 */

import { useState, useEffect, useCallback } from "react";
import type { InputMode, UISuggestion, CustomCommand } from "../types.ts";
import { fuzzyMatch } from "../suggest.ts";
import {
  BUILT_IN_COMMANDS,
  getBuiltInDescription,
  MENTIONS,
  PATH_MENTION_TYPES,
} from "../commands.ts";
import { getFileSuggestions, type FileSuggestion } from "../utils/fileSuggestions.ts";

const MAX_VISIBLE_SUGGESTIONS = 8;

export interface UseInputModeReturn {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  inputMode: InputMode;
  suggestions: UISuggestion[];
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  suggestionScrollOffset: number;
  showSuggestionPanel: boolean;
  inputAreaMinHeight: number;
  inputAreaPaddingTop: number;
}

export interface UseInputModeOptions {
  customCommands: CustomCommand[];
  cwd?: string;
}

/**
 * Manages input mode state and suggestion generation
 */
export function useInputMode(
  options: UseInputModeOptions
): UseInputModeReturn {
  const { customCommands, cwd = process.cwd() } = options;
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("chat");
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionScrollOffset, setSuggestionScrollOffset] = useState(0);
  const [fileSuggestions, setFileSuggestions] = useState<FileSuggestion[]>([]);

  // Get file/folder suggestions for @file and @folder mentions
  const fetchFileSuggestions = useCallback(async (query: string, mentionType: string) => {
    try {
      // Determine which type of items to show
      const showFoldersOnly = mentionType === "folder";
      const extensions = showFoldersOnly ? undefined : [".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".md", ".txt", ".html", ".css", ".yml", ".yaml"];

      const results = await getFileSuggestions(cwd, query, {
        maxResults: MAX_VISIBLE_SUGGESTIONS,
        showHidden: false,
        extensions,
      });

      setFileSuggestions(results);
    } catch (error) {
      console.error("Error fetching file suggestions:", error);
      setFileSuggestions([]);
    }
  }, [cwd]);

  // Command / mention detection + fuzzy suggestions
  useEffect(() => {
    if (input.startsWith("/")) {
      setInputMode("command");
      setFileSuggestions([]);
      const query = input.slice(1);
      const customKeys = new Set(customCommands.map((c) => c.name));
      const items = [
        ...BUILT_IN_COMMANDS.map((c) => ({
          key: c.name,
          description: c.description,
          keywords: c.keywords,
          requiresValue: c.requiresValue,
        })),
        ...customCommands.map((c) => ({
          key: c.name,
          description: c.description,
        })),
      ];
      const matches = fuzzyMatch(query, items, items.length);
      const mapped: UISuggestion[] = matches.map((m) => ({
        label: m.key,
        description:
          m.description ||
          (customKeys.has(m.key)
            ? "Custom command"
            : getBuiltInDescription(m.key) || ""),
        kind: customKeys.has(m.key) ? "custom-command" : "command",
        score: m.score,
        keywords: m.keywords,
        requiresValue: m.requiresValue,
      }));
      setSuggestions(mapped);
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
    } else if (input.startsWith("@")) {
      setInputMode("mention");
      const query = input.slice(1);

      // Check if user is typing a path after @file or @folder
      const pathMentionMatch = query.match(/^(file|folder)[\s\/](.*)$/i);

      if (pathMentionMatch) {
        // User is typing @file path/ or @folder path/
        const [, rawMentionType, pathQuery] = pathMentionMatch;
        const mentionType = rawMentionType?.toLowerCase() || "file";

        // Fetch file/folder suggestions
        void fetchFileSuggestions(pathQuery || "", mentionType);

        // Still show the mention type as first option
        const mentionMeta = MENTIONS.find(m => m.name === mentionType);
        const mapped: UISuggestion[] = [{
          label: mentionType,
          description: mentionMeta?.description || "",
          kind: "mention",
          score: 100,
          keywords: [mentionType],
        }];
        setSuggestions(mapped);
        setSelectedSuggestionIndex(0);
        setSuggestionScrollOffset(0);
      } else {
        // User is typing @ or @mentionType without path
        setFileSuggestions([]);
        const items = MENTIONS.map((m) => ({
          key: m.name,
          description: m.description,
          supportsPath: m.supportsPath,
        }));
        const matches = fuzzyMatch(query, items, items.length);
        const mapped: UISuggestion[] = matches.map((m) => ({
          label: m.key,
          description: m.description,
          kind: "mention",
          score: m.score,
          keywords: [m.key],
        }));
        setSuggestions(mapped);
        setSelectedSuggestionIndex(0);
        setSuggestionScrollOffset(0);
      }
    } else {
      setInputMode("chat");
      setSuggestions([]);
      setFileSuggestions([]);
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
    }
  }, [input, customCommands, fetchFileSuggestions]);

  // Combine static suggestions with file suggestions
  useEffect(() => {
    if (fileSuggestions.length > 0 && input.startsWith("@")) {
      const query = input.slice(1);
      const pathMentionMatch = query.match(/^(file|folder)[\s\/](.*)$/i);

      if (pathMentionMatch) {
        // Add file/folder suggestions after the mention type
        const fileItems: UISuggestion[] = fileSuggestions.map((f) => ({
          label: f.path,
          description: f.description || (f.isDirectory ? "Directory" : f.type.toUpperCase()),
          kind: f.isDirectory ? "folder" : "file" as const,
          keywords: [f.name],
          path: f.path,
          score: 0, // File suggestions don't need fuzzy score
        }));

        setSuggestions((prev) => [...prev, ...fileItems]);
      }
    }
  }, [fileSuggestions, input]);

  // Update scroll offset when selected index changes
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
  }, [selectedSuggestionIndex, suggestionScrollOffset]);

  // Clamp scroll offset when suggestions change
  useEffect(() => {
    const maxOffset = Math.max(0, suggestions.length - MAX_VISIBLE_SUGGESTIONS);
    setSuggestionScrollOffset((prev) => Math.min(prev, maxOffset));
  }, [suggestions.length]);

  const showSuggestionPanel = inputMode !== "chat";
  const inputAreaMinHeight = showSuggestionPanel ? 9 : 4;
  const inputAreaPaddingTop = showSuggestionPanel ? 1 : 0;

  return {
    input,
    setInput,
    inputMode,
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    suggestionScrollOffset,
    showSuggestionPanel,
    inputAreaMinHeight,
    inputAreaPaddingTop,
  };
}
