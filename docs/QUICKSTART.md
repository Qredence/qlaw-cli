# Quick Start Guide

Get your interactive chat TUI running in 3 minutes!

## Prerequisites

- [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- Terminal with 256-color support
- macOS, Linux, or Windows with WSL

## Installation

```bash
cd qlaw-cli
bun install
```

## Try It Out

### 1. Start the Application

```bash
bun run start
```

**What you'll see:**

- Claude Code-inspired design with warm accents
- Clean message history with visual hierarchy
- Streaming AI responses
- Smart input with autocomplete
- Command and mention system with suggestions
- Session management

**Try these:**

- Type a message and press Enter to chat with AI
- Type `/help` to see available commands
- Type `/sessions` to view all sessions
- Type `/new` to start a new session
- Type `@` to see mention options
- Press Esc to exit

### 2. Development Mode (Auto-reload)

```bash
bun run dev
```

## Understanding the Code

### Basic Structure

```typescript
// 1. State management
const [messages, setMessages] = useState<Message[]>([...])
const [input, setInput] = useState("")
const [isProcessing, setIsProcessing] = useState(false)

// 2. Keyboard shortcuts
useKeyboard((key) => {
  if (key.ctrl && key.name === "k") {
    renderer?.toggleDebugOverlay()
  }
})

// 3. Input handling
const handleSubmit = useCallback(() => {
  // Add user message
  setMessages(prev => [...prev, userMessage])

  // Simulate AI response
  setTimeout(() => {
    setMessages(prev => [...prev, aiMessage])
  }, 1000)
}, [input])

// 4. UI layout
return (
  <box flexDirection="column" flexGrow={1}>
    <box>Header</box>
    <scrollbox>Messages</scrollbox>
    <box>Input</box>
  </box>
)
```

### Key Files

- **`src/index.tsx`** - Main application with all features
- **`examples/api-integration.tsx`** - Real API integration examples
- **`docs/ARCHITECTURE.md`** - Detailed technical documentation
- **`docs/API-INTEGRATION.md`** - API integration guide

## Next Steps

### 1. Customize the UI

Edit colors in `src/index.tsx`:

```typescript
const COLORS = {
  primary: "#00D9FF", // Cyan (AI messages)
  success: "#00FF88", // Green (User messages)
  warning: "#FFAA00", // Orange (System)
  muted: "#666666", // Gray (Timestamps)
};
```

### 2. Add Your API

See `examples/api-integration.tsx` for complete examples.

**Quick example:**

```typescript
const handleSubmit = useCallback(async () => {
  const response = await fetch("YOUR_API_URL", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input }),
  });

  const data = await response.json();

  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content: data.content,
      timestamp: new Date(),
    },
  ]);
}, [input]);
```

### 3. Add Features

**Message persistence:**

```typescript
useEffect(() => {
  localStorage.setItem("messages", JSON.stringify(messages));
}, [messages]);
```

**Multi-line input:**

```typescript
// Replace <input> with <textarea>
<textarea onInput={handleInput} onSubmit={handleSubmit} focused={!isProcessing} />
```

**Code syntax highlighting:**

```typescript
import { SyntaxHighlight } from "@opentui/core";

<syntax-highlight language="typescript" code={codeBlock} />;
```

## Common Issues

### Issue: Input not responding

**Solution:** Make sure `focused={true}` is set on the input component.

### Issue: Messages not scrolling

**Solution:** Check that `scrollBoxRef` is properly attached:

```typescript
const scrollBoxRef = useRef<any>(null)

<scrollbox ref={scrollBoxRef}>
  {/* content */}
</scrollbox>
```

### Issue: Terminal looks broken

**Solution:** Ensure your terminal supports 256 colors:

```bash
echo $TERM  # Should show "xterm-256color" or similar
```

### Issue: TypeScript errors

**Solution:** Make sure all dependencies are installed:

```bash
bun install
```

## Tips & Tricks

### 1. Use Debug Console

Press **Ctrl+K** to toggle the debug console and see:

- Rendering performance
- Component tree
- Event logs

### 2. Test Keyboard Shortcuts

The `useKeyboard` hook captures all key events:

```typescript
useKeyboard((key) => {
  console.log("Key pressed:", key.name, key.ctrl, key.shift);
});
```

### 3. Inspect Layout

OpenTUI uses flexbox-style layouts. Use these style properties:

- `flexDirection: "column" | "row"`
- `flexGrow: 1` (takes remaining space)
- `justifyContent: "center" | "flex-start" | "flex-end"`
- `alignItems: "center" | "flex-start" | "flex-end"`

### 4. Performance Optimization

For large message histories:

```typescript
const memoizedMessages = useMemo(
  () => messages.slice(-50), // Only show last 50
  [messages]
);
```

## Resources

- **OpenTUI Docs**: Check the [WARP.md](../opentui/WARP.md) in parent directory
- **Examples**: Look at `packages/react/examples/` in OpenTUI repo
- **API Guide**: See [examples/README.md](./examples/README.md)
- **Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)

## Get Help

If you encounter issues:

1. Check the debug console (Ctrl+K)
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details
3. Look at OpenTUI examples in parent directory
4. Check if your terminal supports required features

## What's Next?

- [ ] Integrate with your AI API
- [ ] Add message persistence
- [ ] Implement streaming responses
- [ ] Add syntax highlighting for code
- [ ] Create custom themes
- [ ] Add file upload support
- [ ] Implement conversation history
- [ ] Add export functionality

---

**Happy coding!** 🚀

For questions or issues, refer to the documentation in this repository.
