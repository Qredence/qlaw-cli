# QLAW CLI – AGENT WORKFLOW GUIDE

This repo hosts the Bun-based `qlaw` terminal client plus the optional Python Agent Framework bridge in `bridge/`. Keep this document up to date whenever tooling, runbooks, or multi-agent wiring changes.

## Default Tooling
- **Shell:** zsh (examples below assume `# from repo root`).
- **JS/TS runtime:** Bun (`bun install`, `bun run <script>`).
- **Python env:** uv (use `uv pip install -r <file>` and `uv run …`).
- **Multi-agent backbone:** microsoft/agent-framework workflows exposed through the bridge and consumed via OpenAI Responses-compatible SSE.

## Dev Setup
```zsh
# from repo root
bun install                 # install CLI dependencies
cp .env.example .env        # set OPENAI_* + AF_* envs for CLI usage
uv pip install -r bridge/requirements.txt   # install bridge runtime deps
```

## Running the CLI
- `bun run dev` – hot reload terminal UI.
- `bun run start` – production-ish run.
- `bun run cli:af` – boot CLI wired to the bridge (defaults: `AF_BRIDGE_BASE_URL=http://127.0.0.1:8081`, `AF_MODEL=multi_tier_support`).
- Env switches: `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `LITELLM_MODEL`, `LLM_PROVIDER`, `AF_BRIDGE_BASE_URL`, `AF_MODEL`.

## Settings & Configuration Flow
- All preferences persist to `~/.qlaw-cli/qlaw_settings.json` (auto-created on first run).
- `/settings panel` opens the interactive overlay (Core API, UI, Coding Agent, Agent Framework sections). Use `↑`/`↓` or `Tab` to select, `Enter` to edit/toggle, `Esc` to close. Running `/settings` without the `panel` suffix prints the summary inline.
- Text fields open inline prompts that update the stored settings immediately; Agent Framework rows mirror `/af-bridge` + `/af-model`.
- `workflow.enabled` (toggled via the overlay) controls whether the CLI prefers workflow/agent-framework mode by default.
 - `tools.enabled` and `tools.autoApprove` control whether tool calls (read/list/write/run) are allowed and whether safe tools auto-run.

## Keybindings
- The suggestion list exposes three configurable actions: `nextSuggestion`, `prevSuggestion`, and `autocomplete`.
- Use `/keybindings` to view current bindings, `/keybindings set <action> <binding>` (e.g., `ctrl+n`, `shift+tab`) to change them, and `/keybindings reset` to restore defaults.

## Agent Framework Wiring Tips
- `/af-bridge <url>` and `/af-model <name>` update the per-user defaults without touching `.env`.
- When both values are present and the CLI is in workflow mode, messages stream via `startWorkflow` (see `src/workflow.ts`).
- `/agents`, `/workflow`, `/run`, `/continue`, and `/judge` remain the quick helpers for guiding a multi-agent session; combine them with mentions like `@coder` or `@planner` for direct routing.

## Coding Agent Tools
- Enable with `/tools on` or Settings → Coding Agent.
- The assistant can request tools using a fenced `tool` JSON block (see `src/tools/prompt.ts`).
- Safe tools (`read_file`, `list_dir`) can auto-approve; `write_file` and `run_command` always prompt.
- Permissions follow `allow | ask | deny` and can be adjusted via `/tools perm <tool> <mode>`.

## Bridge Service (FastAPI)
```zsh
# from repo root
uv pip install -r bridge/requirements.txt    # ensures FastAPI, SQLAlchemy, etc.
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o-mini"
# optional: HOST / PORT variables
bun run bridge                               # runs ./bridge/run.sh which shells into uvicorn
```
- `bridge/run.sh` auto-adds a sibling `agent-framework` checkout to `PYTHONPATH` if present.
- The bridge spawns a multi-tier handoff workflow (triage → replacement → delivery → billing) using `agent_framework`. Replace `create_workflow()` with real agents when integrating with production handoff flows.
- Responses are SSE streams compatible with the OpenAI Responses API so qlaw-cli can treat the bridge exactly like OpenAI.
- Workflow/run/audit metadata is stored in `bridge.db` (SQLite) with timezone-aware UTC timestamps; a background task periodically prunes expired workflows and enforces any configured `MAX_WORKFLOWS` limit.

## Tests & Checks
- TypeScript: `bun run typecheck`, `bun test`, `bun run check` (typecheck + tests).
- Bridge Python: `uv pip install -r bridge/requirements-dev.txt` (one time) then `uv run pytest bridge/tests`.
- Combined e2e sanity: `bun run e2e:bridge` (expects bridge already running and env vars set).

## Multi-Agent Workflow Notes
- The bridge currently models a multi-step handoff workflow; each RequestInfoEvent is surfaced to qlaw-cli via `response.trace.complete/workflow_info`. The CLI detects this via `src/af.ts` and can prompt the user, then POST back to `/v1/workflows/{entity_id}/send_responses`.
- When expanding to a richer Agents SDK orchestration:
  1. Run Codex CLI as an MCP server (Agents SDK doc pattern) and register specialized agents (Planner, Implementer, Reviewer).
  2. Use the bridge as the transport so qlaw-cli remains the human-facing console while Codex agents coordinate via agent-framework handoffs.
  3. Document added roles / tools here plus in `docs/` if workflows change; keep AF model names and env vars synced with CLI defaults.

## Updating This File
- Add new scripts, env vars, or workflow conventions as soon as they are stable.
- If repo conventions diverge from global defaults (different package manager, different MCP servers, etc.), document that deviation here.
