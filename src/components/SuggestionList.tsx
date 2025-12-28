import { TextAttributes } from "@opentui/core";
import React, { useMemo } from "react";
import type { ThemeTokens } from "../themes";
import type { InputMode, UISuggestion } from "../types";

interface SuggestionListProps {
  suggestions: UISuggestion[];
  selectedIndex: number;
  scrollOffset: number;
  inputMode: InputMode;
  input: string;
  colors: ThemeTokens;
  maxVisible?: number;
}

/** Get an icon for a file/folder suggestion */
function getSuggestionIcon(kind: UISuggestion["kind"], isSelected: boolean, colors: ThemeTokens): string {
  switch (kind) {
    case "folder":
      return isSelected ? "📂" : "📁";
    case "file":
      return "📄";
    default:
      return "";
  }
}

/** Get the kind label for display */
function getKindLabel(kind: UISuggestion["kind"]): string {
  switch (kind) {
    case "custom-command":
      return "custom";
    case "command":
      return "built-in";
    case "file":
      return "file";
    case "folder":
      return "folder";
    default:
      return "mention";
  }
}

export function SuggestionList({
  suggestions,
  selectedIndex,
  scrollOffset,
  inputMode,
  input,
  colors,
  maxVisible = 8,
}: SuggestionListProps) {
  const query = useMemo(() => {
    if (inputMode === "command" || inputMode === "mention") {
      return input.slice(1).trim();
    }
    return "";
  }, [inputMode, input]);

  const suggestionHeader = useMemo(() => {
    if (inputMode === "command") return "Commands";
    if (inputMode === "mention") return "Mentions";
    return "Suggestions";
  }, [inputMode]);

  const suggestionEmptyMessage = useMemo(() => {
    if (inputMode === "command") return "No commands match. Try /help.";
    if (inputMode === "mention") return "No mention types match.";
    return "";
  }, [inputMode]);

  const window = useMemo(() => {
    if (suggestions.length === 0) {
      return { items: [], offset: 0, hasAbove: false, hasBelow: false };
    }
    const maxOffset = Math.max(0, suggestions.length - maxVisible);
    const offset = Math.min(scrollOffset, maxOffset);
    const items = suggestions.slice(offset, offset + maxVisible);
    return {
      items,
      offset,
      hasAbove: offset > 0,
      hasBelow: offset + items.length < suggestions.length,
    };
  }, [suggestions, scrollOffset, maxVisible]);

  const selected = suggestions[selectedIndex];

  const actionHint = useMemo(() => {
    if (inputMode === "command") {
      if (selected?.requiresValue) return "enter edit • tab autocomplete • esc cancel";
      return "enter run • tab autocomplete • esc cancel";
    }
    if (inputMode === "mention") return "enter insert • tab autocomplete • esc cancel";
    return "";
  }, [inputMode, selected?.requiresValue]);

  function splitMatch(label: string, match: string): [string, string, string] {
    if (!match) return [label, "", ""];
    const lower = label.toLowerCase();
    const q = match.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return [label, "", ""];
    return [label.slice(0, idx), label.slice(idx, idx + match.length), label.slice(idx + match.length)];
  }

  if (suggestions.length === 0) {
    return (
      <box
        style={{
          marginBottom: 1,
          backgroundColor: colors.bg.panel,
          border: true,
          borderColor: colors.border,
          padding: 1,
          flexDirection: "column",
        }}
      >
        <text
          content={`${suggestionHeader}${
            input.startsWith("/") || input.startsWith("@") ? ` · ${input}` : ""
          }`}
          style={{
            fg: colors.text.secondary,
            attributes: TextAttributes.BOLD,
          }}
        />
        <text
          content={suggestionEmptyMessage}
          style={{
            fg: colors.text.dim,
            attributes: TextAttributes.DIM,
            marginTop: 1,
          }}
        />
      </box>
    );
  }

  return (
    <box
      style={{
        marginBottom: 1,
        backgroundColor: colors.bg.panel,
        border: true,
        borderColor: colors.border,
        padding: 1,
        flexDirection: "column",
      }}
    >
      <box style={{ justifyContent: "space-between", marginBottom: 1 }}>
        <text
          content={`${suggestionHeader}${
            input.startsWith("/") || input.startsWith("@") ? ` · ${input}` : ""
          }`}
          style={{
            fg: colors.text.secondary,
            attributes: TextAttributes.BOLD,
          }}
        />
        <box>
          <text
            content={`${selectedIndex + 1}/${suggestions.length}`}
            style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
          />
        </box>
      </box>

      <box flexDirection="column">
        {window.hasAbove && (
          <text
            content="▲"
            style={{
              fg: colors.text.dim,
              attributes: TextAttributes.DIM,
            }}
          />
        )}

        {window.items.map((s, index) => {
          const globalIndex = window.offset + index;
          const isSelected = globalIndex === selectedIndex;
          const prefix = inputMode === "command" ? "/" : "@";
          const kindLabel = getKindLabel(s.kind);
          const icon = getSuggestionIcon(s.kind, isSelected, colors);
          const [before, match, after] = splitMatch(s.label, query);

          // For file/folder suggestions, don't show the @ prefix in the label
          const showPrefix = s.kind !== "file" && s.kind !== "folder";

          return (
            <box
              key={`${s.kind}:${s.label}`}
              style={{
                paddingLeft: 1,
                paddingRight: 1,
                backgroundColor: isSelected ? colors.bg.hover : "transparent",
                flexDirection: "row",
                justifyContent: "space-between",
                height: 1,
              }}
            >
              <box style={{ flexDirection: "row", flexShrink: 1 }}>
                {icon && (
                  <text
                    content={icon + " "}
                    style={{
                      fg: isSelected ? colors.text.accent : colors.text.primary,
                      marginRight: 1,
                    }}
                  />
                )}
                <box style={{ flexDirection: "row" }}>
                  {showPrefix && (
                    <text
                      content={prefix}
                      style={{
                        fg: isSelected ? colors.text.accent : colors.text.primary,
                        attributes: isSelected ? TextAttributes.BOLD : 0,
                      }}
                    />
                  )}
                  <text
                    content={before}
                    style={{
                      fg: isSelected ? colors.text.accent : colors.text.primary,
                      attributes: isSelected ? TextAttributes.BOLD : 0,
                    }}
                  />
                  {match && (
                    <text
                      content={match}
                      style={{
                        fg: colors.text.accent,
                        attributes: TextAttributes.BOLD,
                      }}
                    />
                  )}
                  <text
                    content={after}
                    style={{
                      fg: isSelected ? colors.text.accent : colors.text.primary,
                      attributes: isSelected ? TextAttributes.BOLD : 0,
                      marginRight: 2,
                    }}
                  />
                </box>
                {s.description && (
                  <text
                    content={` · ${s.description}`}
                    style={{
                      fg: colors.text.dim,
                      attributes: TextAttributes.DIM,
                    }}
                  />
                )}
              </box>
              <box style={{ flexDirection: "row" }}>
                <text
                  content={kindLabel}
                  style={{ fg: colors.text.tertiary, attributes: TextAttributes.DIM, marginLeft: 2 }}
                />
              </box>
            </box>
          );
        })}

        {window.hasBelow && (
          <text
            content="▼"
            style={{
              fg: colors.text.dim,
              attributes: TextAttributes.DIM,
            }}
          />
        )}
      </box>

      <box style={{ marginTop: 1, flexDirection: "column" }}>
        {selected && (
          <>
            {/* Show the selected item - for file/folder use the label directly */}
            <text
              content={
                selected.kind === "file" || selected.kind === "folder"
                  ? selected.label
                  : `${inputMode === "command" ? "/" : "@"}${selected.label}`
              }
              style={{ fg: colors.text.secondary, attributes: TextAttributes.BOLD }}
            />
            {selected.description && selected.kind !== "file" && selected.kind !== "folder" && (
              <text
                content={selected.description}
                style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
              />
            )}
            {/* Show file/folder metadata */}
            {selected.kind === "file" && selected.path && (
              <text
                content={selected.path}
                style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
              />
            )}
            {selected.kind === "folder" && selected.path && (
              <text
                content={`${selected.path}/`}
                style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
              />
            )}
            {selected.keywords && selected.keywords.length > 0 && (
              <text
                content={`keywords: ${selected.keywords.join(", ")}`}
                style={{ fg: colors.text.tertiary, attributes: TextAttributes.DIM }}
              />
            )}
          </>
        )}
        {actionHint && (
          <text
            content={actionHint}
            style={{ fg: colors.text.dim, attributes: TextAttributes.DIM, marginTop: 1 }}
          />
        )}
      </box>
    </box>
  );
}
