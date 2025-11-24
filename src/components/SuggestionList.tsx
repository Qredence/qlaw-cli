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

export function SuggestionList({
  suggestions,
  selectedIndex,
  scrollOffset,
  inputMode,
  input,
  colors,
  maxVisible = 8,
}: SuggestionListProps) {
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
          const kindLabel =
            s.kind === "custom-command"
              ? "custom"
              : s.kind === "command"
              ? "built-in"
              : "mention";

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
                <text
                  content={`${prefix}${s.label}`}
                  style={{
                    fg: isSelected ? colors.text.accent : colors.text.primary,
                    attributes: isSelected ? TextAttributes.BOLD : 0,
                    marginRight: 2,
                  }}
                />
                {s.description && (
                  <text
                    content={s.description}
                    style={{
                      fg: colors.text.dim,
                      attributes: TextAttributes.DIM,
                    }}
                  />
                )}
              </box>
              <box style={{ flexDirection: "row" }}>
                {typeof (s as any).score === "number" && (
                  <text
                    content={`score ${(s as any).score}`}
                    style={{ fg: colors.text.tertiary, attributes: TextAttributes.DIM, marginRight: 2 }}
                  />
                )}
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
    </box>
  );
}
