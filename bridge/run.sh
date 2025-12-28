#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./run.sh
#
# Requirements:
#   - Python venv with FastAPI + Uvicorn installed (see requirements.txt)
#   - agent_framework importable (install locally or set PYTHONPATH)
#   - Real model backend configured via env (OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL)
#
# Optional:
#   - PORT (default: 8081)
#   - HOST (default: 127.0.0.1)

: "${HOST:=127.0.0.1}"
: "${PORT:=8081}"

# Try to auto-add local agent-framework package to PYTHONPATH if present (monorepo layout)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
# qlaw-cli/bridge -> repo root is one level up
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
# Candidate path where 'agent_framework' package directory exists
CAND_PY_PATH_1="$REPO_ROOT/../agent-framework/agent-framework/python/packages/core"
if [[ -d "$CAND_PY_PATH_1/agent_framework" ]]; then
  export PYTHONPATH="${PYTHONPATH:+${PYTHONPATH}:}$CAND_PY_PATH_1"
fi

if [[ -z "${OPENAI_BASE_URL:-}" || -z "${OPENAI_API_KEY:-}" || -z "${OPENAI_MODEL:-}" ]]; then
  if [[ -n "${LITELLM_BASE_URL:-}" || -n "${LITELLM_API_KEY:-}" || -n "${LITELLM_MODEL:-}" ]]; then
    export OPENAI_BASE_URL="${OPENAI_BASE_URL:-${LITELLM_BASE_URL:-}}"
    export OPENAI_API_KEY="${OPENAI_API_KEY:-${LITELLM_API_KEY:-}}"
    export OPENAI_MODEL="${OPENAI_MODEL:-${LITELLM_MODEL:-}}"
  fi
fi

if [[ -z "${OPENAI_BASE_URL:-}" || -z "${OPENAI_API_KEY:-}" || -z "${OPENAI_MODEL:-}" ]]; then
  echo "[warn] OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL not set."
  echo "       The bridge uses OpenAIChatClient by default. Set these or LITELLM_* vars."
fi

# If you have a local agent-framework checkout, set PYTHONPATH to make it importable.
# Example:
#   export PYTHONPATH="/path/to/agent-framework/python/packages/core"

exec uv run uvicorn bridge.bridge_server:app --host "$HOST" --port "$PORT" --reload
