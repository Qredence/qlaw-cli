/**
 * Example: Real API Integration with Streaming
 * 
 * This file demonstrates how to integrate your chat interface
 * with a real API endpoint, including streaming support.
 */

import { TextAttributes, createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard, useRenderer } from "@opentui/react"
import { useCallback, useEffect, useRef, useState } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Configuration
const API_CONFIG = {
  endpoint: process.env.API_ENDPOINT || "http://localhost:3000/api/chat",
  apiKey: process.env.API_KEY || "",
  streaming: true,
}

function App() {
  const renderer = useRenderer()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollBoxRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollToBottom?.()
    }
  }, [messages])

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      // Cancel current request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        setIsProcessing(false)
      }
    } else if (key.name === "escape") {
      renderer?.stop()
    }
  })

  const handleInput = useCallback((value: string) => {
    setInput(value)
  }, [])

  // Example 1: Simple API Call (non-streaming)
  const handleSubmitSimple = useCallback(async () => {
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
    setError(null)

    try {
      const response = await fetch(API_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(API_CONFIG.apiKey && { Authorization: `Bearer ${API_CONFIG.apiKey}` }),
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || data.message || "No response",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)

      // Optionally add error as a message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }, [input, isProcessing, messages])

  // Example 2: Streaming API Call
  const handleSubmitStreaming = useCallback(async () => {
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
    setError(null)

    // Create assistant message with empty content
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])

    // Create abort controller for cancellation
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch(API_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(API_CONFIG.apiKey && { Authorization: `Bearer ${API_CONFIG.apiKey}` }),
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Response body is not readable")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process server-sent events (SSE)
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)

            if (data === "[DONE]") {
              break
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.content || parsed.delta?.content || ""

              if (content) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: msg.content + content } : msg
                  )
                )
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e)
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: msg.content + "\n\n[Cancelled]" } : msg
          )
        )
      } else {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        setError(errorMessage)

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: `Error: ${errorMessage}` } : msg
          )
        )
      }
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }, [input, isProcessing, messages])

  // Choose which submit handler to use based on config
  const handleSubmit = API_CONFIG.streaming ? handleSubmitStreaming : handleSubmitSimple

  return (
    <box flexDirection="column" flexGrow={1}>
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
          content="QLAW CLI (API Mode)"
          style={{
            fg: "#00D9FF",
            attributes: TextAttributes.BOLD,
          }}
        />
        <text
          content={`${API_CONFIG.streaming ? "Streaming" : "Standard"} | Ctrl+C: Cancel | Esc: Exit`}
          style={{
            fg: "#666666",
            attributes: TextAttributes.DIM,
          }}
        />
      </box>

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
              <text
                content={message.role === "user" ? "You" : "AI"}
                style={{
                  fg: message.role === "user" ? "#00FF88" : "#00D9FF",
                  attributes: TextAttributes.BOLD,
                  marginBottom: 1,
                }}
              />

              <text
                content={message.content}
                style={{
                  fg: "#FFFFFF",
                  wrap: true,
                }}
              />

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
                content="● Waiting for response... (Ctrl+C to cancel)"
                style={{
                  fg: "#00D9FF",
                  attributes: TextAttributes.DIM | TextAttributes.ITALIC,
                }}
              />
            </box>
          )}

          {error && (
            <box style={{ marginTop: 2 }}>
              <text
                content={`⚠ Error: ${error}`}
                style={{
                  fg: "#FF0000",
                }}
              />
            </box>
          )}
        </box>
      </scrollbox>

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
          placeholder="Type your message..."
          value={input}
          onInput={handleInput}
          onSubmit={handleSubmit}
          focused={!isProcessing}
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
