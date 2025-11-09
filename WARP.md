# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: qlaw-cli — a Bun + TypeScript terminal chat UI built on OpenTUI/React, published as a CLI (bin: qlaw).

Common commands
- Install deps: bun install
- Run (watch mode): bun run dev
- Run (normal): bun run start
- Run entry directly: bun run src/index.tsx
- Typecheck: bun run typecheck
- Run the example app: bun run examples/api-integration.tsx
- Run with env (OpenAI/Azure): OPENAI_BASE_URL=... OPENAI_API_KEY=... OPENAI_MODEL=... bun run src/index.tsx
  - The CLI tries Azure-compatible auth when OPENAI_BASE_URL contains azure.com or /openai/; otherwise uses Bearer

Notes
- No tests or linter configuration are present. CI only performs typechecking.
- The package exposes a global binary name qlaw when installed via npm/yarn/pnpm/bun.

High-level architecture
- Runtime & packaging
  - Bun-based CLI with shebang in src/index.tsx (#!/usr/bin/env bun)
  - package.json: "bin": { "qlaw": "./src/index.tsx" }, scripts for dev/start/typecheck, no build step (tsc is noEmit)
  - TypeScript config (tsconfig.json): ESNext target, bundler moduleResolution, react-jsx with @opentui/react as jsxImportSource
- UI stack (OpenTUI + React)
  - Boot: createCliRenderer() then createRoot(renderer).render(<App />)
  - The UI is composed with OpenTUI primitives: box, scrollbox, text, input; React state hooks manage view
  - Layout
    - Header bar with app title
    - Main scrollbox: either a welcome screen or message list (user/assistant/system)
    - Overlays: session list and settings panels (absolute-positioned boxes)
    - Input area with autocomplete dropdown for commands/mentions and a status line
  - Keyboard handling via useKeyboard: arrow navigation for suggestions, Tab to autocomplete, Esc to close overlays/exit, Ctrl+C to exit, Ctrl+K to toggle OpenTUI debug console
- Chat/state model
  - Message shape: {id, role: user|assistant|system, content, timestamp}
  - Sessions persisted via localStorage (keys: qlaw_settings, qlaw_sessions, qlaw_custom_commands) with basic JSON serialization
  - Settings include theme, timestamps, autoScroll, and API connection (model, endpoint, apiKey) initialized from environment variables when present
  - Suggestions system
    - When input starts with "/": command mode; offers built-in commands (clear, help, model, settings, sessions, status, terminal-setup, commands, export, theme) plus any custom commands
    - When input starts with "@": mention mode; offers context, file, code, docs
- AI integration (Responses API streaming)
  - Environment: OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL are required for network calls
  - Auth header: if base URL appears Azure-like, use header "api-key"; else use Authorization: Bearer
  - Request: POST {base}/responses with JSON { model, input: <flattened history>, stream: true }
  - Streaming: reads text/event-stream and handles common event names (response.output_text.delta, message.delta, response.delta), appending deltas to the in-progress assistant message; errors surfaced from response.error; supports [DONE]
  - History sent as a plain-text transcript (User/Assistant/System blocks) for broad proxy compatibility
- Commands and overlays
  - executeCommand implements switch-based handlers for built-in commands; some commands toggle overlay flags (showSessionList, showSettingsMenu) or mutate settings; custom commands are listed/persisted but not executed yet
- Examples
  - examples/api-integration.tsx demonstrates non-streaming and streaming integration with an arbitrary HTTP backend, including cancellation via AbortController, and a simplified OpenTUI UI

CI/CD
- .github/workflows/ci.yml
  - Sets up Bun, installs deps, runs typecheck, and validates presence of package.json
- .github/workflows/publish.yml
  - Trusted Publishing with npm provenance via GitHub OIDC
  - On push to main (or manual), if version in package.json is not yet on npm, it verifies (npm pack --dry-run), creates a version tag v{version}, publishes (npm publish --provenance), and creates a GitHub Release

Key files
- package.json — scripts, bin mapping (qlaw), deps (@opentui/core, @opentui/react, react), devDeps (typescript)
- tsconfig.json — JSX and bundler-mode TypeScript configuration
- src/index.tsx — CLI entrypoint and entire app (UI, state, streaming, commands)
- examples/api-integration.tsx — reference for wiring to a custom API (non-streaming and streaming)
- .github/workflows/* — CI/typecheck and npm publish automation

Environment
- Required to talk to a model endpoint:
  - OPENAI_BASE_URL: base URL to a Responses API-compatible service
  - OPENAI_API_KEY: API credential (Bearer or Azure api-key)
  - OPENAI_MODEL: model identifier
- You can pass these inline per-invocation or set them in your shell/env; the app also mirrors them into initial settings for persistence
