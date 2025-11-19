import { TextAttributes } from "@opentui/core";
import type { ThemeTokens } from "../themes";
import type { InputMode } from "../types";

interface InputAreaProps {
  input: string;
  inputMode: InputMode;
  isProcessing: boolean;
  placeholder: string;
  hint: string;
  colors: ThemeTokens;
  onInput: (val: string) => void;
  onSubmit: () => void;
}

export function InputArea({
  input,
  inputMode,
  isProcessing,
  placeholder,
  hint,
  colors,
  onInput,
  onSubmit,
}: InputAreaProps) {
  const borderColor =
    inputMode === "command"
      ? colors.text.accent
      : inputMode === "mention"
      ? colors.text.tertiary
      : colors.border;

  return (
    <box
      style={{
        border: true,
        borderColor: borderColor,
        backgroundColor: colors.bg.secondary,
        padding: 1,
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <box style={{ flexDirection: "row", alignItems: "center", height: 1 }}>
        <text
          content={
            inputMode === "command" ? "/" : inputMode === "mention" ? "@" : "> "
          }
          style={{
            fg: borderColor,
            attributes: TextAttributes.BOLD,
            marginRight: 1,
          }}
        />
        <input
          placeholder={placeholder}
          value={input}
          onInput={onInput}
          onSubmit={onSubmit}
          focused={!isProcessing}
          style={{
            flexGrow: 1,
            backgroundColor: colors.bg.secondary,
            focusedBackgroundColor: colors.bg.secondary,
            textColor: colors.text.primary,
            focusedTextColor: colors.text.primary,
            placeholderColor: colors.text.dim,
            cursorColor: borderColor,
          }}
        />
      </box>
      <box style={{ marginTop: 1, justifyContent: "space-between" }}>
        <text
          content={hint}
          style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
        />
        {isProcessing && (
          <text content="Processing..." style={{ fg: colors.text.accent }} />
        )}
      </box>
    </box>
  );
}
