# Copilot Instructions for qlaw-cli

This repository contains a terminal UI chat application (`qlaw-cli`) built with **Bun**, **React**, and **OpenTUI**, integrated with a Python-based **Agent Framework** bridge.

## 🏗 Architecture & Big Picture

- **Frontend (TUI):** A React application rendering to the terminal via `@opentui/react`.
  - **Entry Point:** `src/index.tsx` contains the main `App` component and UI logic.
  - **Rendering:** Uses `<box>`, `<text>`, `<input>`, and `<scrollbox>` components.
  - **State:** React hooks manage UI state; `src/storage.ts` handles persistence to `~/.qlaw-cli/qlaw_settings.json`.
- **Backend (Bridge):** A Python FastAPI server (`bridge/bridge_server.py`) acting as an adapter between the CLI and the Agent Framework.
  - **Communication:** The CLI consumes Server-Sent Events (SSE) from the bridge (`src/sse.ts`).
  - **Protocol:** Mimics OpenAI's API (`/v1/responses`) for compatibility.
- **Agent Framework:** The bridge orchestrates multi-agent workflows (e.g., handoffs) using the `agent_framework` Python package.

## 🛠 Critical Workflows

- **Package Management:**
  - **JS/TS:** Always use `bun` (e.g., `bun install`, `bun add`).
  - **Python:** Always use `uv` (e.g., `uv pip install -r bridge/requirements.txt`).
- **Running the App:**
  - `bun run dev`: Start CLI in watch mode.
  - `bun run bridge`: Start the Python bridge server (requires `uv`).
  - `bun run handoff`: Start both bridge and CLI for full workflow testing.
- **Testing:** `bun test` runs the test suite (using Bun's built-in test runner).

## 🧩 Patterns & Conventions

- **Single-File UI:** `src/index.tsx` is intentionally large to keep UI logic centralized. Avoid splitting components unless necessary for reuse.
- **Command System:**
  - Define new commands in `src/commands.ts`.
  - Implement handlers in `src/commandHandlers.ts`.
  - Register in `src/index.tsx`'s `executeCommand`.
- **Mentions:** `@file`, `@code`, `@docs` handled in `src/mentionHandlers.ts` before sending to the LLM.
- **Streaming:** Responses are streamed via SSE. The CLI handles `response.trace.complete` events for special UI overlays (like agent handoffs).
- **Styling:** Use `src/themes.ts` for color tokens. Avoid hardcoded hex values in components.

## 🔌 Integration Points

- **OpenAI/Azure:** Configured via `src/api.ts`. The CLI can talk directly to OpenAI or via the bridge.
- **Agent Bridge:**
  - **CLI Side:** `src/af.ts` and `src/workflow.ts` manage bridge interactions.
  - **Bridge Side:** `bridge/bridge_server.py` maps HTTP requests to `agent_framework` calls.
  - **Database:** The bridge uses SQLite (`bridge.db`) for workflow state and audit logs.

## 📂 Key Files

- `src/index.tsx`: Main UI application.
- `bridge/bridge_server.py`: Python bridge implementation.
- `src/api.ts`: API client and auth logic.
- `src/storage.ts`: Settings and session persistence.
- `AGENTS.md`: Documentation for agent workflows and bridge setup.
