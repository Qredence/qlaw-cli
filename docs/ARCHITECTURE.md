# QLAW CLI Architecture

## Overview

This project implements an interactive terminal chat interface similar to OpenCode or Claude Code, built with OpenTUI and React.

## Project Structure

```
qlaw-cli/
├── src/
│   ├── index.tsx            # Main application composition
│   ├── llm/
│   │   ├── config.ts         # Provider resolution + auth headers
│   │   └── input.ts          # Prompt building for Responses API
│   ├── tools/
│   │   ├── index.ts          # Tool registry + execution
│   │   ├── permissions.ts    # Tool permission policy
│   │   └── prompt.ts         # Tool-call system prompt
│   ├── services/
│   │   ├── commandService.ts # Command dispatch and context
│   │   └── streamingService.ts # OpenAI-style streaming orchestration
│   ├── commandHandlers.ts   # Individual command handlers
│   ├── mentionHandlers.ts   # Mention detection/formatting
│   ├── commands.ts          # Command/mention registry
│   ├── types.ts             # Shared types
│   ├── storage.ts           # Settings/session persistence
│   ├── api.ts               # Env and auth helpers
│   ├── sse.ts               # SSE parsing utilities
│   ├── af.ts                # AF request info parsing/display
│   ├── suggest.ts           # Fuzzy autocomplete
│   ├── themes.ts            # Theme tokens
│   ├── uiHelpers.ts         # Input UI helper text
│   └── utils.ts             # Terminal utilities
├── examples/
│   ├── api-integration.tsx
│   └── README.md
├── docs/
│   ├── QUICKSTART.md
│   ├── UI-REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── DESIGN.md
│   └── CHANGELOG.md
├── package.json
└── README.md
```

## Core Components

### Main Chat Interface (`src/index.tsx`)

The main application file composes UI and orchestrates services:

- **UI Components**: Message display, input area, overlays, suggestions
- **State Management**: React hooks for messages, sessions, settings, input modes
- **Event Handling**: Keyboard shortcuts, input submission, command execution
- **Streaming Integration**: Delegates to `services/streamingService.ts`

### Command System

`services/commandService.ts` centralizes dispatch; `src/commandHandlers.ts` contains individual handlers.

- Individual handler functions for each command (`handleClearCommand`, `handleHelpCommand`, etc.)
- Command context interface for shared state access
- Consistent return type for command results
- Improves testability and maintainability

**Available Commands:**
- `/clear` - Clear chat history
- `/help` - Show help information
- `/model` - Set model name
- `/endpoint` - Set API endpoint
- `/api-key` - Set API key
- `/settings` - Open settings menu
- `/sessions` - View sessions
- `/status` - Show status
- `/terminal-setup` - Terminal setup guide
- `/commands` - Manage custom commands
- `/theme` - Toggle theme
- `/export` - Export chat

### Mention Handlers (`src/mentionHandlers.ts`)

Mention processing and formatting:

- **`detectMentions()`**: Finds all mentions in text
- **`formatMessageWithMentions()`**: Formats messages with structured mention blocks
- **Mention Types**: `@context`, `@file`, `@code`, `@docs`
- Automatically formats mentions to provide structured context to AI

**Example:**
```typescript
@docs API authentication
// Formats to:
[Documentation Reference: API authentication]

Please reference the documentation for "API authentication" when providing your response.
```

`@file` now reads and inlines file contents (truncated for safety) so the model sees actual code context.

### Coding Agent Tools (`src/tools/*`)

Tool execution is opt-in and permissioned:
- `parseToolCalls()` extracts fenced JSON tool blocks.
- `executeToolCall()` runs file and shell tools with size guards.
- `resolveToolPermission()` enforces `allow | ask | deny` policies plus external-directory/doom-loop checks.

The UI runs a tool loop: execute tools → append results → re-prompt the model to continue.

### Utilities (`src/utils.ts`)

Terminal and common utilities:

- **`getTerminalDimensions()`**: Gets terminal size with fallbacks
- **`createStdoutWithDimensions()`**: Creates stdout wrapper with dimensions
- Handles edge cases for non-interactive environments

## Component Architecture

### State Management

```typescript
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    type?: "text" | "code" | "error";
    language?: string;
  };
}
```

State hooks:

- `messages`: Array of Message objects
- `sessions`: Map of session IDs to session data
- `currentSessionId`: Active session identifier
- `input`: Current input field value
- `isProcessing`: Boolean to track AI processing state
- `showSettings`: Boolean for settings overlay visibility
- `showSessions`: Boolean for session list overlay visibility
- `suggestions`: Array of autocomplete suggestions
- `selectedSuggestionIndex`: Currently selected suggestion
- `settings`: User preferences (timestamps, autoScroll, etc.)

### Layout Structure

```
┌─────────────────────────────────────┐
│ Header (fixed height: 3)            │
│ - Title + Session name               │
│ - Status indicators                  │
├─────────────────────────────────────┤
│                                      │
│ Messages Area (flex-grow: 1)        │
│ - Scrollable with visual feedback   │
│ - Auto-scroll to bottom              │
│ - Role-based styling                 │
│                                      │
│ [Settings Overlay]                   │
│ [Sessions List Overlay]              │
│                                      │
├─────────────────────────────────────┤
│ Suggestions (when active)            │
│ - Command/mention autocomplete       │
├─────────────────────────────────────┤
│ Input Area (fixed height: 4)        │
│ - Mode indicator                     │
│ - Input field with placeholder       │
└─────────────────────────────────────┘
```

## Key Implementation Details

### 1. Message Display

Each message is rendered with:

- Role-based header (color-coded)
- Message content (with word wrapping)
- Timestamp (dimmed)
- Spacing between messages

```tsx
<box key={message.id} style={{ marginBottom: 2, flexDirection: "column" }}>
  <text content={roleName} style={{ fg: roleColor, attributes: BOLD }} />
  <text content={message.content} style={{ wrap: true }} />
  <text content={timestamp} style={{ fg: "#666666", attributes: DIM }} />
</box>
```

### 2. Auto-Scrolling

Implemented using `useEffect` and `scrollBoxRef`:

```tsx
const scrollBoxRef = useRef<any>(null);

useEffect(() => {
  if (scrollBoxRef.current) {
    scrollBoxRef.current.scrollToBottom?.();
  }
}, [messages]);
```

### 3. Keyboard Handling

Global keyboard shortcuts using `useKeyboard` hook:

```tsx
useKeyboard((key) => {
  if (key.ctrl && key.name === "k") {
    renderer?.toggleDebugOverlay();
  }
  if (key.name === "escape") {
    renderer?.stop();
  }
});
```

### 4. Input Handling

Two-step process:

1. `onInput` callback updates state
2. `onSubmit` callback sends message

```tsx
const handleInput = useCallback((value: string) => {
  setInput(value);
}, []);

const handleSubmit = useCallback(() => {
  if (!input.trim() || isProcessing) return;

  // Add user message
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setIsProcessing(true);

  // Simulate AI response
  setTimeout(() => {
    setMessages((prev) => [...prev, assistantMessage]);
    setIsProcessing(false);
  }, 1000);
}, [input, isProcessing]);
```

## Styling System

### Color Palette

- **Primary (Cyan)**: `#00D9FF` - Brand color, AI messages
- **Success (Green)**: `#00FF88` - User messages
- **Warning (Orange)**: `#FFAA00` - System messages
- **Muted (Gray)**: `#666666` - Timestamps, hints
- **Background Dark**: `#1A1A1A` - Input background
- **Background Light**: `#2A2A2A` - Focused input, hover states

### Text Attributes

- `TextAttributes.BOLD` - Headers, role names
- `TextAttributes.DIM` - Secondary info, timestamps
- `TextAttributes.ITALIC` - Processing indicator

## AF Bridge & Streaming

- `src/af.ts` parses RequestInfoEvent and formats inline overlays.
- `src/sse.ts` normalizes SSE events from OpenAI-compatible endpoints.
- Bridge (`bridge/`) provides example FastAPI endpoints for AF workflows.

## Next Steps

### 1. Real API Integration

Replace the mock response with actual API calls:

```typescript
const handleSubmit = useCallback(async () => {
  // ... add user message ...

  try {
    const response = await fetch("YOUR_API_ENDPOINT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      },
    ]);
  } catch (error) {
    // Handle error
  } finally {
    setIsProcessing(false);
  }
}, [input]);
```

### 2. Streaming Responses

Implement streaming for real-time response display:

```typescript
const handleSubmit = useCallback(async () => {
  const assistantMessage: Message = {
    id: Date.now().toString(),
    role: "assistant",
    content: "",
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, assistantMessage]);

  const response = await fetch("YOUR_API_ENDPOINT", {
    method: "POST",
    body: JSON.stringify({ message: input }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);

    setMessages((prev) => prev.map((msg) => (msg.id === assistantMessage.id ? { ...msg, content: msg.content + chunk } : msg)));
  }
}, [input]);
```

### 3. Message History Persistence

Store messages in localStorage or a database:

```typescript
// Save messages
useEffect(() => {
  localStorage.setItem("chat-history", JSON.stringify(messages));
}, [messages]);

// Load messages on mount
useEffect(() => {
  const saved = localStorage.getItem("chat-history");
  if (saved) {
    setMessages(JSON.parse(saved));
  }
}, []);
```

### 4. Rich Content Rendering

Add support for:

- **Code blocks**: Syntax highlighting with tree-sitter
- **Markdown**: Bold, italic, lists, links
- **Images**: ASCII art or sixel graphics
- **Tables**: Formatted data display

### 5. Advanced Features

- **Multi-line input**: Textarea component for longer messages
- **File attachments**: Drag-and-drop or file picker
- **Context awareness**: Show current working directory, git status
- **Command suggestions**: Autocomplete for common commands
- **Session management**: Multiple conversation threads
- **Export/Import**: Save conversations to files

## Performance Considerations

1. **Message Virtualization**: For large message histories, use virtual scrolling
2. **Debouncing**: Debounce input handling for smoother typing
3. **Memoization**: Use `useMemo` for expensive computations
4. **Lazy Loading**: Load message history incrementally

## Testing

Recommended testing approach:

```typescript
import { createTestRenderer } from "@opentui/core/testing";

describe("ChatInterface", () => {
  it("should render initial message", async () => {
    const renderer = createTestRenderer();
    // ... test implementation
  });

  it("should handle user input", async () => {
    // ... test implementation
  });
});
```

## Resources

- [OpenTUI Documentation](https://github.com/opentui/opentui)
- [OpenTUI React Reconciler](https://github.com/opentui/opentui/tree/main/packages/react)
- [Bun Runtime](https://bun.sh)
