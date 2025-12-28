# Agent Framework Bridge (Example)

A minimal bridge that exposes an OpenAI Responses-compatible API for running Agent Framework handoff workflows end-to-end with qlaw-cli.

Endpoints
- POST /v1/responses (SSE): start a workflow run (workflow.run_stream)
- POST /v1/workflows/{entity_id}/send_responses (SSE): continue a run (workflow.send_responses_streaming)

Quick start
1) Python deps (suggested):
   - FastAPI, Uvicorn
   - SQLAlchemy (for the built-in SQLite run/audit store)
   - Agent Framework (install from source or your package)

   Example with uv:
   ```bash
   # from repo root
   uv pip install -r bridge/requirements.txt
   # Ensure agent_framework is importable; e.g., install from local checkout or pip if available
   ```

2) Configure your model backend (for OpenAIChatClient):
   - OPENAI_BASE_URL
   - OPENAI_API_KEY
   - OPENAI_MODEL

   Example:
   ```bash
   export OPENAI_BASE_URL="http://localhost:8080/v1"
   export OPENAI_API_KEY="sk-xxx"
   export OPENAI_MODEL="gpt-4o-mini"
   ```

   Or LiteLLM (OpenAI-compatible proxy):
   ```bash
   export LITELLM_BASE_URL="http://localhost:4000/v1"
   export LITELLM_API_KEY="sk-xxx"
   export LITELLM_MODEL="openai/gpt-4o-mini"
   ```

3) Start the bridge (recommended):
   ```bash
   # from repo root
   bun run bridge   # runs ./bridge/run.sh and starts uvicorn with reload
   ```

   Or directly with uvicorn:
   ```bash
   uvicorn bridge.bridge_server:app --host 127.0.0.1 --port 8081 --reload
   ```

4) Point qlaw-cli at the bridge:
   ```bash
   export AF_BRIDGE_BASE_URL="http://127.0.0.1:8081"
   export AF_MODEL="multi_tier_support"   # matches the workflow name in this example
   bun run src/index.tsx
   ```

Behavior
- The bridge creates a multi-tier handoff workflow (triage → replacement → delivery → billing) similar to the sample handoff_specialist_to_specialist.py.
- RequestInfoEvent is streamed as `response.trace.complete` with `{ trace_type: "workflow_info", event_type: "RequestInfoEvent" }` and includes:
  - request_id, source_executor_id
  - prompt
  - conversation snapshot (role, author_name, text)
- qlaw-cli detects the event, shows an overlay, and sends continuation via the `/send_responses` endpoint.

Persistence & lifecycle
- Workflows and run/audit metadata are stored in a local SQLite database (`bridge.db`) using SQLAlchemy.
- The FastAPI app uses a lifespan handler to create tables on startup and runs a background task that periodically prunes expired workflows and enforces the `MAX_WORKFLOWS` limit.

Testing
- Dev requirements (including pytest) live in `bridge/requirements-dev.txt`.
- To run the bridge tests with uv:
  ```bash
  uv pip install -r bridge/requirements-dev.txt
  uv run pytest bridge/tests
  ```

Notes
- Replace the create_workflow() implementation to wire your real agents/clients.
- For Azure clients, swap OpenAIChatClient with AzureOpenAIChatClient and configure credentials accordingly.
