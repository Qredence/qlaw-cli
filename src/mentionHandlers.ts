/**
 * Mention handlers for processing @mentions in user messages
 * Formats mentions to provide structured context to the AI
 */

export type MentionType = "context" | "file" | "code" | "docs" | "coder" | "planner" | "reviewer" | "judge";

export interface MentionMatch {
  type: MentionType;
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Detects mentions in text and returns matches
 */
export function detectMentions(text: string): MentionMatch[] {
  const mentions: MentionMatch[] = [];
  const mentionRegex = /@(context|file|code|docs|coder|planner|reviewer|judge)(?:\s+([^\n@]+))?/gi;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const index = match.index;
    if (index === undefined || !match[1]) continue;
    const type = match[1].toLowerCase() as MentionType;
    const content = match[2]?.trim() || "";
    mentions.push({
      type,
      content,
      startIndex: index,
      endIndex: index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Formats a message with mentions processed
 * Replaces mentions with formatted versions for better AI understanding
 */
export function formatMessageWithMentions(message: string): string {
  const mentions = detectMentions(message);
  if (mentions.length === 0) {
    return message;
  }

  // Build formatted message by replacing mentions in reverse order
  let formatted = message;
  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);

  for (const mention of sortedMentions) {
    const originalText = message.slice(mention.startIndex, mention.endIndex);
    const formattedMention = formatMention(mention.type, mention.content);
    formatted = formatted.slice(0, mention.startIndex) + formattedMention + formatted.slice(mention.endIndex);
  }

  return formatted;
}

/**
 * Formats a single mention based on its type
 */
function formatMention(type: MentionType, content: string): string {
  switch (type) {
    case "docs":
      if (content) {
        return `[Documentation Reference: ${content}]\n\nPlease reference the documentation for "${content}" when providing your response.`;
      }
      return `[Documentation Reference]\n\nPlease reference relevant documentation when providing your response.`;

    case "file":
      if (content) {
        return `[File Reference: ${content}]\n\nPlease consider the contents of the file "${content}" when providing your response.`;
      }
      return `[File Reference]\n\nPlease consider relevant files when providing your response.`;

    case "code":
      if (content) {
        return `[Code Snippet]\n\`\`\`\n${content}\n\`\`\`\n\nPlease analyze this code snippet when providing your response.`;
      }
      return `[Code Snippet]\n\nPlease consider relevant code when providing your response.`;

    case "context":
      if (content) {
        return `[Additional Context: ${content}]\n\nPlease consider this additional context when providing your response.`;
      }
      return `[Additional Context]\n\nPlease consider any additional context when providing your response.`;

    default:
      // Agent mentions route intent; include an explicit tag
      if (type === "coder" || type === "planner" || type === "reviewer" || type === "judge") {
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        const body = content ? `\n\n${content}` : "";
        return `[Agent: ${label}]${body}`;
      }
      return content;
  }
}

/**
 * Checks if a message contains any mentions
 */
export function hasMentions(text: string): boolean {
  return /@(context|file|code|docs|coder|planner|reviewer|judge)/i.test(text);
}
