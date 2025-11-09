import { TextAttributes, createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard, useRenderer } from "@opentui/react"
import { useCallback, useEffect, useRef, useState } from "react"

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

interface CommandPaletteItem {
  id: string
  label: string
  description: string
  action: () => void
}

function App() {
  const renderer = useRenderer()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "system",
      content: "Welcome to QLAW CLI - Your AI-powered terminal assistant",
      timestamp: new Date(),
    },
    {
      id: "2",
      role: "assistant",
      content: "Hello! I can help you with:\n• Code generation and review\n• Terminal commands\n• Documentation lookup\n• Problem solving\n\nWhat would you like to work on?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState(0)
  const scrollBoxRef = useRef<any>(null)

  const commands: CommandPaletteItem[] = [
    {
      id: "clear",
      label: "Clear Chat",
      description: "Clear all messages",
      action: () => {
        setMessages([])
        setShowCommandPalette(false)
      },
    },
    {
      id: "export",
      label: "Export Chat",
      description: "Export conversation to file",
      action: () => {
        const systemMessage: Message = {
          id: Date.now().toString(),
          role: "system",
          content: "Chat exported successfully (mock)",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, systemMessage])
        setShowCommandPalette(false)
      },
    },
    {
      id: "help",
      label: "Show Help",
      description: "Display keyboard shortcuts",
      action: () => {
        const helpMessage: Message = {
          id: Date.now().toString(),
          role: "system",
          content: "Keyboard Shortcuts:\n• Ctrl+P: Command Palette\n• Ctrl+K: Debug Console\n• Ctrl+L: Clear Screen\n• Esc: Exit",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, helpMessage])
        setShowCommandPalette(false)
      },
    },
  ]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollToBottom?.()
    }
  }, [messages])

  useKeyboard((key) => {
    if (showCommandPalette) {
      // Command palette navigation
      if (key.name === "escape") {
        setShowCommandPalette(false)
        setSelectedCommand(0)
      } else if (key.name === "up") {
        setSelectedCommand((prev) => (prev > 0 ? prev - 1 : commands.length - 1))
      } else if (key.name === "down") {
        setSelectedCommand((prev) => (prev < commands.length - 1 ? prev + 1 : 0))
      } else if (key.name === "return") {
        commands[selectedCommand]?.action()
        setSelectedCommand(0)
      }
      return
    }

    // Global shortcuts
    if (key.ctrl && key.name === "p") {
      setShowCommandPalette(true)
    } else if (key.ctrl && key.name === "k") {
      renderer?.toggleDebugOverlay()
      renderer?.console.toggle()
    } else if (key.ctrl && key.name === "l") {
      setMessages([])
    } else if (key.name === "escape") {
      renderer?.stop()
    }
  })

  const handleInput = useCallback((value: string) => {
    setInput(value)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsProcessing(true)

    // Simulate AI response with different types
    setTimeout(() => {
      const query = input.toLowerCase()
      let response: Message

      if (query.includes("code") || query.includes("function") || query.includes("write")) {
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: 'Here\'s a simple example:\n\nfunction greet(name: string) {\n  return `Hello, ${name}!`\n}\n\nThis function takes a name and returns a greeting.',
          timestamp: new Date(),
          metadata: { type: "code", language: "typescript" },
        }
      } else if (query.includes("help") || query.includes("command")) {
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I can assist with:\n\n1. Writing and reviewing code\n2. Explaining terminal commands\n3. Debugging issues\n4. Architecture decisions\n\nPress Ctrl+P to see all available commands!",
          timestamp: new Date(),
        }
      } else {
        const responses = [
          "Let me help you with that. Could you provide more details?",
          "Interesting question! Here's my analysis...",
          "Based on your query, I recommend the following approach.",
          "I can definitely help with that. Here's what I suggest:",
        ]
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        }
      }

      setMessages((prev) => [...prev, response])
      setIsProcessing(false)
    }, 1000)
  }, [input, isProcessing])

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box
        style={{
          height: 3,
          borderBottom: true,
          padding: 1,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <text
          content="QLAW CLI"
          style={{
            fg: "#00D9FF",
            attributes: TextAttributes.BOLD,
          }}
        />
        <text
          content={`Messages: ${messages.length} | Ctrl+P: Commands | Esc: Exit`}
          style={{
            fg: "#666666",
            attributes: TextAttributes.DIM,
          }}
        />
      </box>

      {/* Main Content Area */}
      <box flexGrow={1} style={{ position: "relative" }}>
        {/* Messages Area */}
        <scrollbox
          ref={scrollBoxRef}
          style={{
            flexGrow: 1,
            padding: 1,
            marginBottom: 1,
          }}
        >
          <box flexDirection="column" style={{ width: "100%" }}>
            {messages.map((message, index) => (
              <box
                key={message.id}
                style={{
                  marginBottom: index < messages.length - 1 ? 2 : 0,
                  flexDirection: "column",
                }}
              >
                {/* Message Header */}
                <text
                  content={
                    message.role === "user"
                      ? "You"
                      : message.role === "system"
                        ? "System"
                        : "QLAW AI"
                  }
                  style={{
                    fg:
                      message.role === "user"
                        ? "#00FF88"
                        : message.role === "system"
                          ? "#FFAA00"
                          : "#00D9FF",
                    attributes: TextAttributes.BOLD,
                    marginBottom: 1,
                  }}
                />

                {/* Message Content */}
                <text
                  content={message.content}
                  style={{
                    fg: message.role === "system" ? "#CCCCCC" : "#FFFFFF",
                    wrap: true,
                  }}
                />

                {/* Timestamp */}
                <text
                  content={message.timestamp.toLocaleTimeString()}
                  style={{
                    fg: "#666666",
                    attributes: TextAttributes.DIM,
                    marginTop: 1,
                  }}
                />
              </box>
            ))}

            {isProcessing && (
              <box style={{ marginTop: 2 }}>
                <text
                  content="● QLAW AI is thinking..."
                  style={{
                    fg: "#00D9FF",
                    attributes: TextAttributes.DIM | TextAttributes.ITALIC,
                  }}
                />
              </box>
            )}
          </box>
        </scrollbox>

        {/* Command Palette Overlay */}
        {showCommandPalette && (
          <box
            style={{
              position: "absolute",
              top: 5,
              left: "50%",
              width: 60,
              border: true,
              backgroundColor: "#1A1A1A",
              padding: 1,
              zIndex: 100,
            }}
          >
            <box flexDirection="column" style={{ width: "100%" }}>
              <text
                content="Command Palette"
                style={{
                  fg: "#00D9FF",
                  attributes: TextAttributes.BOLD,
                  marginBottom: 1,
                }}
              />
              {commands.map((cmd, idx) => (
                <box
                  key={cmd.id}
                  style={{
                    marginTop: 1,
                    padding: 1,
                    backgroundColor: idx === selectedCommand ? "#2A2A2A" : "transparent",
                  }}
                >
                  <box flexDirection="column">
                    <text
                      content={cmd.label}
                      style={{
                        fg: idx === selectedCommand ? "#FFFFFF" : "#CCCCCC",
                        attributes: idx === selectedCommand ? TextAttributes.BOLD : 0,
                      }}
                    />
                    <text
                      content={cmd.description}
                      style={{
                        fg: "#666666",
                        attributes: TextAttributes.DIM,
                      }}
                    />
                  </box>
                </box>
              ))}
            </box>
          </box>
        )}
      </box>

      {/* Input Area */}
      <box
        style={{
          height: 4,
          borderTop: true,
          padding: 1,
          flexDirection: "column",
        }}
      >
        <text
          content={isProcessing ? "Processing..." : "Message:"}
          style={{
            fg: isProcessing ? "#FFAA00" : "#AAAAAA",
            marginBottom: 1,
          }}
        />
        <input
          placeholder="Type your message... (Press Enter to send)"
          value={input}
          onInput={handleInput}
          onSubmit={handleSubmit}
          focused={!isProcessing && !showCommandPalette}
          style={{
            flexGrow: 1,
            backgroundColor: "#1A1A1A",
            focusedBackgroundColor: "#2A2A2A",
          }}
        />
      </box>
    </box>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
