import { TextAttributes, RGBA, SyntaxStyle } from "@opentui/core";
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
  const syntaxStyle = SyntaxStyle.fromStyles({
    keyword: { fg: RGBA.fromHex("#ff6b6b"), bold: true },
    string: { fg: RGBA.fromHex("#51cf66") },
    comment: { fg: RGBA.fromHex("#868e96"), italic: true },
    number: { fg: RGBA.fromHex("#ffd43b") },
    default: { fg: RGBA.fromHex(colors.text.primary) },
  });
  return (
    <box
      flexDirection="column"
      style={{
        width: "100%",
        flexGrow: 1,
        justifyContent: "flex-end",
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
        paddingBottom: 1,
      }}
    >
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isSystem = message.role === "system";

        if (isSystem) {
          return (
            <box
              key={message.id}
              style={{ marginBottom: 1, justifyContent: "flex-start" }}
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
              alignItems: "flex-start",
            }}
          >
            <box
              style={{
                backgroundColor: isUser ? colors.bg.hover : "transparent",
                padding: 1,
                border: true,
                borderColor: colors.border,
              }}
            >
              {message.content.includes("```") ? (
                (() => {
                  const m = message.content.match(/```(\w+)?\n([\s\S]*?)```/);
                  const code = m ? m[2] : message.content.replace(/```/g, "");
                  const ft = m && m[1] ? m[1] : "plaintext";
                  return (
                    <code content={code} filetype={ft} syntaxStyle={syntaxStyle} />
                  );
                })()
              ) : (
                <text
                  content={message.content}
                  style={{ fg: isUser ? colors.text.primary : colors.text.secondary }}
                />
              )}
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
              }}
            />
          </box>
        );
      })}
    </box>
  );
}
