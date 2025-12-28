# API Integration Guide

This guide shows how to integrate qlaw-cli with various AI services and backends.

## Table of Contents

- [OpenAI](#openai)
- [LiteLLM Proxy](#litellm-proxy)
- [Azure OpenAI](#azure-openai)
- [Custom Backends](#custom-backends)
- [Agent Framework Bridge](#agent-framework-bridge)
- [Popular AI Services](#popular-ai-services)
- [Environment Variables](#environment-variables)

---

## OpenAI

qlaw-cli uses OpenAI's API by default. Here's how to set it up:

### 1. Get an API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your key
OPENAI_API_KEY=sk-...your-key-here
```

### 3. Optional Configuration

```bash
# Choose a model (default: gpt-4)
OPENAI_MODEL=gpt-4-turbo-preview

# Set custom base URL (for proxies)
OPENAI_BASE_URL=https://api.openai.com/v1

# Adjust parameters
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000
```

---

## LiteLLM Proxy

Use LiteLLM when you want a single OpenAI-compatible endpoint that can route to many providers.

```bash
# Point at your LiteLLM proxy
LITELLM_BASE_URL=http://localhost:4000/v1
LITELLM_API_KEY=sk-...   # optional if your proxy enforces keys

# LiteLLM-style model identifiers
LITELLM_MODEL=openai/gpt-4o-mini
# or
LITELLM_MODEL=anthropic/claude-3-5-sonnet-20241022

# Optional: force provider detection
LLM_PROVIDER=litellm
```

You can also set these via `/provider`, `/endpoint`, `/api-key`, and `/model` inside the CLI.
When you switch `/provider litellm`, the CLI will prefer `LITELLM_*` envs and clear any OpenAI defaults if they were still in use.

---

## Azure OpenAI

To use Azure OpenAI instead of OpenAI:

### 1. Get Azure Credentials

From your Azure OpenAI resource:
- API Key
- Endpoint URL
- Deployment name

### 2. Configure Environment

```bash
# Use Azure instead of OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name

# Optional: API version
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 3. Auto-Detection

The application automatically detects Azure configuration and uses the appropriate client.

---

## Custom Backends

### Using a Proxy or Custom Endpoint

```bash
# Set custom base URL
OPENAI_BASE_URL=http://localhost:8080/v1

# Or for Azure
AZURE_OPENAI_ENDPOINT=https://custom-endpoint.com
```

### Example: Local Ollama

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Run a model
ollama run llama2

# Configure qlaw-cli
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama  # Ollama doesn't require a real key
OPENAI_MODEL=llama2
```

### Example: LM Studio

```bash
# Start LM Studio server on port 1234

# Configure qlaw-cli
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=lm-studio
OPENAI_MODEL=local-model
```

---

## Agent Framework Bridge

qlaw-cli can also talk to a Python Agent Framework bridge that exposes an OpenAI Responses-compatible SSE API. This is useful when you want multi-agent handoff workflows while keeping qlaw-cli as the human-facing console.

### 1. Start the bridge

See `bridge/README.md` for full details. Typical dev flow:

```bash
# from repo root
uv pip install -r bridge/requirements.txt
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini
bun run bridge   # runs ./bridge/run.sh -> uvicorn bridge.bridge_server:app
```

### 2. Point qlaw-cli at the bridge

Set Agent Framework env vars so the CLI speaks to the bridge instead of OpenAI directly:

```bash
export AF_BRIDGE_BASE_URL="http://127.0.0.1:8081"
export AF_MODEL="multi_tier_support"   # matches the Agent Framework workflow name

# run CLI with AF wiring
bun run cli:af
```

Under the hood, the bridge:
- Runs a multi-tier Agent Framework handoff workflow.
- Streams `response.output_text.delta` events for final text.
- Emits `response.trace.complete` events with `trace_type: "workflow_info"` for `RequestInfoEvent`s, which qlaw-cli parses via `src/af.ts` to drive interactive handoff prompts.

---

## Popular AI Services

### Anthropic Claude

Claude uses a different API format. Integration coming in v0.3.0.

### Google Gemini

Gemini integration planned for v0.3.0.

### Mistral AI

Mistral uses OpenAI-compatible API:

```bash
OPENAI_BASE_URL=https://api.mistral.ai/v1
OPENAI_API_KEY=your-mistral-key
OPENAI_MODEL=mistral-medium
```

---

## Environment Variables

### Complete Reference

```bash
# OpenAI (default)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4                    # Default model
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEMPERATURE=0.7                # 0.0 to 2.0
OPENAI_MAX_TOKENS=2000               # Max response length

# LiteLLM (OpenAI-compatible proxy)
LITELLM_BASE_URL=http://localhost:4000/v1
LITELLM_API_KEY=sk-...
LITELLM_MODEL=openai/gpt-4o-mini
LLM_PROVIDER=litellm

# Azure OpenAI (alternative)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_DEPLOYMENT=...
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Application Settings
APP_DEBUG=false                      # Enable debug logging
SESSION_STORAGE_PATH=~/.qlaw/sessions
```

### Security Best Practices

**Never commit API keys to version control!**

```bash
# ✅ Good: Use environment variables
export OPENAI_API_KEY=sk-...

# ✅ Good: Use .env file (gitignored)
echo "OPENAI_API_KEY=sk-..." > .env

# ❌ Bad: Hardcode in source
const apiKey = "sk-..."  // DON'T DO THIS
```

---

## Streaming

qlaw-cli uses streaming by default for real-time responses as the AI generates them.

---

## Error Handling

### Common Errors

**Invalid API Key**
```
Error: 401 Unauthorized
Solution: Check your API key in .env
```

**Rate Limit Exceeded**
```
Error: 429 Too Many Requests
Solution: Wait and retry, or upgrade your plan
```

**Model Not Found**
```
Error: 404 Model not found
Solution: Check OPENAI_MODEL value
```

---

## Examples

See the [examples/](../examples/) directory for code samples.

---

## Troubleshooting

### API Key Not Working

```bash
# Test your API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Debug Mode

```bash
# Enable debug logging
export APP_DEBUG=true
bun run start
```

---

## Need Help?

- 📖 [Quick Start](./QUICKSTART.md)
- 🐛 [Report an Issue](https://github.com/qredence/qlaw-cli/issues)
- 💬 [Discussions](https://github.com/qredence/qlaw-cli/discussions)

---

*Last updated: November 9, 2025*
