import { TextAttributes } from "@opentui/core";
import type { Message } from "../types";
import type { ThemeTokens } from "../themes";

interface MessageListProps {
  messages: Message[];
  isProcessing: boolean;
  spinnerFrame: string;
  colors: ThemeTokens;
}

export function MessageList({
  messages,
  isProcessing,
  spinnerFrame,
  colors,
}: MessageListProps) {
  return (
    <box flexDirection="column" style={{ width: "100%" }}>
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isSystem = message.role === "system";

        if (isSystem) {
          return (
            <box
              key={message.id}
              style={{ marginBottom: 1, justifyContent: "center" }}
            >
              <text
                content={`[ ${message.content} ]`}
                style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
              />
            </box>
          );
        }

        return (
          <box
            key={message.id}
            flexDirection="column"
            style={{
              marginBottom: 1,
              alignItems: isUser ? "flex-end" : "flex-start",
            }}
          >
            <box
              style={{
                backgroundColor: isUser ? colors.bg.hover : "transparent",
                padding: 1,
                border: !isUser,
                borderColor: colors.border,
              }}
            >
              <text
                content={message.content}
                style={{
                  fg: isUser ? colors.text.primary : colors.text.secondary,
                }}
              />
            </box>
            <text
              content={
                isUser
                  ? "You"
                  : `Assistant ${
                      isProcessing && index === messages.length - 1
                        ? spinnerFrame
                        : ""
                    }`
              }
              style={{
                fg: colors.text.dim,
                attributes: TextAttributes.DIM,
                marginTop: 0,
                marginLeft: isUser ? 0 : 1,
                marginRight: isUser ? 1 : 0,
              }}
            />
          </box>
        );
      })}
    </box>
  );
}
