# Examples

This directory contains example implementations showing various integration patterns for qlaw-cli.

## API Integration Example

The `api-integration.tsx` file demonstrates how to connect your chat interface to a real API endpoint.

### Quick Start

```bash
# Set up environment
cp .env.example .env
# Add your API key to .env

# Run the example
bun run examples/api-integration.tsx
```

### Features Demonstrated

- **Simple API Calls** - Standard request/response pattern
- **Streaming Responses** - Server-Sent Events (SSE) for real-time updates
- **Request Cancellation** - Abort in-flight requests
- **Error Handling** - Graceful error display and recovery
- **History Management** - Conversation context

## Full Documentation

For complete API integration guides, see **[docs/API-INTEGRATION.md](../docs/API-INTEGRATION.md)** which covers:

- OpenAI integration
- Azure OpenAI setup
- Custom backends (Ollama, LM Studio)
- Popular AI services (Claude, Gemini, Mistral)
- Environment variables reference
- Error handling
- Security best practices

### API Response Formats

#### Non-Streaming (JSON)

Your API should return:

```json
{
  "content": "This is the AI response",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150
  }
}
```

#### Streaming (Server-Sent Events)

Your API should stream in this format:

```
data: {"content": "This ", "delta": {"content": "This "}}

data: {"content": "is ", "delta": {"content": "is "}}

data: {"content": "streaming", "delta": {"content": "streaming"}}

data: [DONE]
```

### Example Backend (Node.js + Express)

```javascript
import express from "express";

const app = express();
app.use(express.json());

// Non-streaming endpoint
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;

  // Your AI logic here
  const response = await yourAIService.generate(message, history);

  res.json({
    content: response,
    metadata: {
      model: "your-model",
      tokens: response.length,
    },
  });
});

// Streaming endpoint
app.post("/api/chat/stream", async (req, res) => {
  const { message, history } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await yourAIService.generateStream(message, history);

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

app.listen(3000);
```

### Integration with Popular AI Services

#### OpenAI

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function* generateStream(message: string, history: Message[]) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: message }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
```

#### Anthropic (Claude)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function* generateStream(message: string, history: Message[]) {
  const stream = await anthropic.messages.stream({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: message }],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta") {
      yield chunk.delta.text;
    }
  }
}
```

#### Local Models (Ollama)

```typescript
async function* generateStream(message: string, history: Message[]) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama2",
      messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: message }],
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n").filter(Boolean);
    for (const line of lines) {
      const data = JSON.parse(line);
      if (data.message?.content) {
        yield data.message.content;
      }
    }
  }
}
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Configuration
API_ENDPOINT=http://localhost:3000/api/chat
API_KEY=your-api-key-here

# Or for specific services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Testing Without a Backend

You can test the streaming mechanism with a mock server:

```bash
# Install http-server
bun add -g http-server

# Create a mock endpoint
echo '{"content": "Hello from mock server!"}' > response.json

# Run mock server
http-server -p 3000 --cors
```

### Next Steps

1. Implement proper authentication
2. Add rate limiting
3. Handle context length limits
4. Implement message persistence
5. Add support for images/files
6. Implement conversation branching
7. Add model selection UI

## Resources

- 📖 [Full API Integration Guide](../docs/API-INTEGRATION.md)
- 🚀 [Quick Start Guide](../docs/QUICKSTART.md)
- 🏗️ [Architecture Documentation](../docs/ARCHITECTURE.md)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
