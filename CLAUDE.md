# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**qlaw-cli** is a modern terminal UI chat application built with OpenTUI and React that provides an interface similar to Claude Code or Cursor. It's a CLI tool that allows developers to interact with AI models through a clean, keyboard-driven terminal interface.

## Development Commands

### Core Development
```bash
# Install dependencies (user preference - always use uv when possible)
bun install

# Development with file watching
bun run dev

# Production run
bun run start

# Type checking
bun run typecheck

# Run tests
bun run test

# Full check (typecheck + test)
bun run check
```

### Agent Framework Integration
```bash
# Start the bridge server (Python FastAPI backend for Agent Framework)
cd bridge && uvicorn bridge.bridge_server:app --host 127.0.0.1 --port 8081 --reload

# Run with Agent Framework integration
bun run cli:af

# Run end-to-end bridge example
bun run e2e:bridge

# Full handoff workflow (starts bridge + qlaw-cli)
bun run handoff
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure OpenAI/Azure integration
# OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL

# Configure Agent Framework (optional)
# AF_BRIDGE_BASE_URL=http://127.0.0.1:8081
# AF_MODEL=multi_tier_support
```

## Architecture

### Core Structure

**Single-File Architecture**: The entire application is implemented in `src/index.tsx` (1,376 lines) - this is intentional for simplicity and maintainability.

**Key Technologies**:
- **Runtime**: Bun (JavaScript runtime and package manager)
- **UI Framework**: React with OpenTUI for terminal rendering
- **Language**: TypeScript with strict type checking
- **No Build Step**: Runs directly from TypeScript source

### Main Components

**Core UI** (`src/index.tsx`):
- Chat interface with streaming AI responses
- Command system with 10+ built-in commands
- Mention system (@context, @file, @code, @docs)
- Session management with persistence
- Settings management with themes
- Autocomplete with fuzzy matching

**Supporting Files**:
- `src/commands.ts` - Command definitions and metadata
- `src/themes.ts` - Dark/light theme configuration
- `src/suggest.ts` - Fuzzy matching for autocomplete
- `src/af.ts` - Agent Framework integration helpers

**Bridge Server** (`bridge/`):
- Python FastAPI server for Agent Framework integration
- OpenAI Responses-compatible API endpoints
- Workflow handoff support with RequestInfoEvent handling

### State Management

Uses React hooks for state management:
- `messages` - Chat history
- `sessions` - Multiple conversation sessions
- `currentSessionId` - Active session identifier
- `input` - Current input field value
- `isProcessing` - AI processing state
- `settings` - User preferences (theme, API config, etc.)
- Persistence via localStorage

### Input Modes

The application supports multiple input modes:
- **Chat Mode**: Normal message input
- **Command Mode**: Triggered by `/` prefix
- **Mention Mode**: Triggered by `@` prefix
- **Settings Menu**: Overlay for configuration
- **Sessions List**: Overlay for session management

## Agent Framework Integration

### Bridge Architecture

The bridge server provides an OpenAI Responses-compatible API for Agent Framework workflows:

**Endpoints**:
- `POST /v1/responses` (SSE) - Start workflow run
- `POST /v1/workflows/{entity_id}/send_responses` (SSE) - Continue run with handoff

**Integration Flow**:
1. qlaw-cli sends messages to bridge server
2. Bridge server executes Agent Framework workflows
3. RequestInfoEvent streamed for handoff scenarios
4. qlaw-cli detects events and shows interaction overlay
5. User input sent back to continue workflow

### Handoff Support

Special handling for `RequestInfoEvent`:
- Detected via `response.trace.complete` events
- Shows interactive overlay for user input
- Supports multi-tier agent workflows (triage → specialist → resolution)

## Development Patterns

### Adding New Commands

Commands are defined in `src/commands.ts`. To add a new command:

1. Add command definition with metadata
2. Implement handler function in main component
3. Add to command registry in `useCommands` hook
4. Test with `/commands` command

### Theme Development

Themes defined in `src/themes.ts`:
- Dark and light variants
- Consistent color tokens
- Role-based message styling

### Testing

**Current State**: Minimal test coverage with only `tests/af.test.ts`

**Test Runner**: Built-in Bun test runner

**Testing Gaps**:
- No UI component tests
- No integration tests for chat functionality
- No command system tests

**Running Tests**:
```bash
# Run all tests
bun run test

# Run specific test file
bun test tests/af.test.ts
```

## Publishing and Distribution

- **Package Name**: `qlaw-cli` on npm
- **Binary**: Global command `qlaw`
- **No Build Step**: Published as TypeScript source
- **Provenance**: Uses npm provenance for trusted publishing
- **CI/CD**: GitHub Actions handles type checking and publishing

## Environment Variables

### OpenAI/Azure Integration
- `OPENAI_BASE_URL` - API endpoint base URL
- `OPENAI_API_KEY` - API authentication key
- `OPENAI_MODEL` - Model name (e.g., gpt-4, gpt-3.5-turbo)

### Agent Framework
- `AF_BRIDGE_BASE_URL` - Bridge server URL (default: http://127.0.0.1:8081)
- `AF_MODEL` - Workflow name (default: multi_tier_support)

## Key Files to Understand

1. **`src/index.tsx`** - Main application (entire UI in one file)
2. **`package.json`** - Scripts and dependencies
3. **`bridge/bridge_server.py`** - Agent Framework integration
4. **`docs/ARCHITECTURE.md`** - Detailed technical architecture
5. **`README.md`** - User-facing documentation

## Development Notes

- The single-file architecture is intentional - don't split without good reason
- OpenTUI handles all terminal rendering and input management
- Streaming responses are implemented with Server-Sent Events (SSE)
- All user preferences persist via localStorage
- The bridge server enables advanced Agent Framework workflows
- Keyboard-driven workflow is fundamental - avoid mouse-dependent features