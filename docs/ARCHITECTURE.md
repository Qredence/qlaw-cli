# QLAW CLI Architecture

## Overview

This project implements an interactive terminal chat interface similar to OpenCode or Claude Code, built with OpenTUI and React.

## Project Structure

```
qlaw-cli/
├── src/
│   ├── index.tsx          # Basic chat interface
│   └── enhanced.tsx       # Enhanced version with command palette
├── package.json
├── README.md
└── ARCHITECTURE.md        # This file
```

## Core Components

### 1. Basic Chat Interface (`index.tsx`)

The basic implementation includes:

- **Message History**: Scrollable message display with role-based styling
- **Input Field**: Text input with submit on Enter
- **Auto-scrolling**: Automatically scrolls to bottom on new messages
- **Keyboard Shortcuts**: Global shortcuts for debug and exit

#### Key Features:
- Messages array with `user` and `assistant` roles
- Simulated AI responses with delay
- Focus management (input disabled while processing)
- Styled components with OpenTUI primitives

### 2. Enhanced Chat Interface (`enhanced.tsx`)

Extended version with additional features:

- **Command Palette**: Accessible via Ctrl+P
- **System Messages**: Third message type for notifications
- **Smart Responses**: Context-aware mock responses
- **Multiple Commands**: Clear chat, export, help
- **Enhanced Keyboard Navigation**: Arrow keys for command selection

## Component Architecture

### State Management

```typescript
interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: {
    type?: "text" | "code" | "error"
    language?: string
  }
}
```

State hooks:
- `messages`: Array of Message objects
- `input`: Current input field value
- `isProcessing`: Boolean to track AI processing state
- `showCommandPalette`: Boolean for command palette visibility (enhanced)
- `selectedCommand`: Number for command selection index (enhanced)

### Layout Structure

```
┌─────────────────────────────────────┐
│ Header (fixed height: 3)            │
│ - Title                              │
│ - Keyboard shortcuts                 │
├─────────────────────────────────────┤
│                                      │
│ Messages Area (flex-grow: 1)        │
│ - Scrollable                         │
│ - Auto-scroll to bottom              │
│                                      │
│ [Command Palette Overlay]            │
│                                      │
├─────────────────────────────────────┤
│ Input Area (fixed height: 4)        │
│ - Label                              │
│ - Input field                        │
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
const scrollBoxRef = useRef<any>(null)

useEffect(() => {
  if (scrollBoxRef.current) {
    scrollBoxRef.current.scrollToBottom?.()
  }
}, [messages])
```

### 3. Keyboard Handling

Global keyboard shortcuts using `useKeyboard` hook:

```tsx
useKeyboard((key) => {
  if (key.ctrl && key.name === "k") {
    renderer?.toggleDebugOverlay()
  }
  if (key.name === "escape") {
    renderer?.stop()
  }
})
```

### 4. Input Handling

Two-step process:
1. `onInput` callback updates state
2. `onSubmit` callback sends message

```tsx
const handleInput = useCallback((value: string) => {
  setInput(value)
}, [])

const handleSubmit = useCallback(() => {
  if (!input.trim() || isProcessing) return
  
  // Add user message
  setMessages(prev => [...prev, userMessage])
  setInput("")
  setIsProcessing(true)
  
  // Simulate AI response
  setTimeout(() => {
    setMessages(prev => [...prev, assistantMessage])
    setIsProcessing(false)
  }, 1000)
}, [input, isProcessing])
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

## Next Steps for Production

### 1. Real API Integration

Replace the mock response with actual API calls:

```typescript
const handleSubmit = useCallback(async () => {
  // ... add user message ...
  
  try {
    const response = await fetch('YOUR_API_ENDPOINT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    })
    
    const data = await response.json()
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: data.content,
      timestamp: new Date()
    }])
  } catch (error) {
    // Handle error
  } finally {
    setIsProcessing(false)
  }
}, [input])
```

### 2. Streaming Responses

Implement streaming for real-time response display:

```typescript
const handleSubmit = useCallback(async () => {
  const assistantMessage: Message = {
    id: Date.now().toString(),
    role: "assistant",
    content: "",
    timestamp: new Date()
  }
  
  setMessages(prev => [...prev, assistantMessage])
  
  const response = await fetch('YOUR_API_ENDPOINT', {
    method: 'POST',
    body: JSON.stringify({ message: input })
  })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMessage.id
        ? { ...msg, content: msg.content + chunk }
        : msg
    ))
  }
}, [input])
```

### 3. Message History Persistence

Store messages in localStorage or a database:

```typescript
// Save messages
useEffect(() => {
  localStorage.setItem('chat-history', JSON.stringify(messages))
}, [messages])

// Load messages on mount
useEffect(() => {
  const saved = localStorage.getItem('chat-history')
  if (saved) {
    setMessages(JSON.parse(saved))
  }
}, [])
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
import { createTestRenderer } from "@opentui/core/testing"

describe("ChatInterface", () => {
  it("should render initial message", async () => {
    const renderer = createTestRenderer()
    // ... test implementation
  })
  
  it("should handle user input", async () => {
    // ... test implementation
  })
})
```

## Resources

- [OpenTUI Documentation](https://github.com/opentui/opentui)
- [OpenTUI React Reconciler](https://github.com/opentui/opentui/tree/main/packages/react)
- [Bun Runtime](https://bun.sh)
