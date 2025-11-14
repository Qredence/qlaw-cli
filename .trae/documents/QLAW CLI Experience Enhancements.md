## Overview
- Use agent_framework directly for orchestration and streaming, following “handoff_return_to_previous” and the OpenAI-style Responses client patterns.
- Provide FastAPI endpoints for workflow creation, run control, handoff, continue, status, audit, and an SSE bridge for deltas/trace events.
- Exclude authentication as requested; keep future-ready structure to add it later without refactors.

## Stack & Components
- FastAPI + Pydantic + SQLAlchemy (PostgreSQL) + Alembic for models/migrations
- agent_framework: build agents (Coder, Planner, Reviewer, Judge), edges, and executors per samples
- SSE bridge: stream `response.output_text.delta`, `response.trace.complete`, `response.error`
- Redis (optional): cache checkpoints/ephemeral state; durable state in DB

## Agents & Workflow (agent_framework)
- Agents
  - Coder: code generation/modification
  - Planner: task decomposition and strategy
  - Reviewer: QA and feedback
  - Judge: decision control and return-to-previous routing
- Edges
  - Straight handoff: specialist→specialist
  - Return-to-previous: push origin onto stack and resume per sample logic
- Executors
  - Use AF executors to bind agents into workflow nodes; emit traces and streaming events
- Streaming
  - Use AF streaming APIs to produce OpenAI-style response events consumed by QLAW CLI

## Data Model
- `workflows`: id, name, config (JSON), created_at
- `runs`: id, workflow_id, status, started_at, completed_at, current_step, entity_id (AF), last_error
- `steps`: id, run_id, agent, input, output, status, started_at, completed_at, checkpoint_ref
- `handoffs`: id, run_id, from_agent, to_agent, reason, created_at, resolved_at
- `audit_logs`: id, run_id, type, detail (JSON), created_at

## Endpoints (No Auth)
- Workflows
  - `POST /v1/workflows` create
  - `GET /v1/workflows/{id}` read
  - `GET /v1/workflows/{id}/runs` list runs
  - `POST /v1/workflows/{id}/runs` start run (initializes AF entity and run state)
- Run Control
  - `POST /v1/runs/{run_id}/continue` resume from checkpoint via AF
  - `POST /v1/runs/{run_id}/handoff` initiate handoff (records, updates state, enqueues target agent)
  - `GET /v1/runs/{run_id}/status` state snapshot
  - `GET /v1/runs/{run_id}/audit` audit events
- Streaming
  - `GET /v1/runs/{run_id}/responses` Server-Sent Events stream producing deltas and trace completion events

## Orchestration & Async
- Job queue (Celery/Arq/RQ) for `start_run`, `continue_run`, `handoff_execute` invoking AF workflow
- Backoff/retries on transient failures; dead-letter log entries recorded in `audit_logs`
- SSE stream reads from AF response iterator and pushes events to HTTP clients

## Error Handling & Recovery
- Standardized errors: HTTP 4xx/5xx with Pydantic error bodies; SSE `response.error` events
- Checkpoint capture on each step; `/continue` resumes last good state
- Audit logging on every transition: run start, step start/complete, handoff, error, resume, complete

## Serialization & Contracts
- Pydantic request/response models with enums for `AgentRole` and `RunStatus`
- AF trace payload forwarded under `response.trace.complete` and formatted for CLI display
- Stable field names consistent with agent_framework response client shape

## Configuration
- Env variables or `config.yaml` for DB/Redis, logging, and workflow parameters (agent options, thresholds)
- Validate configuration on startup; safe reload for non-critical changes

## QLAW CLI Integration
- CLI starts runs via `POST /v1/workflows/{id}/runs` and listens to `GET /v1/runs/{run_id}/responses` (Accept: text/event-stream)
- Continue with `POST /v1/runs/{run_id}/continue`; handoff via `POST /v1/runs/{run_id}/handoff`
- SSE event shapes match existing CLI stream parser

## Testing
- Unit: models, serializers, endpoint handlers, SSE event generator
- Integration: start→handoff→return→complete, resume from checkpoint, audit inspection
- Performance: concurrent SSE clients; job throughput and run latency
- Security: input validation and rate-limiting stubs (without auth), error sanitization

## Milestones
1. Scaffolding: models/migrations, endpoints, basic workflow creation
2. AF integration: agents, edges, executors, streaming
3. Handoff & return-to-previous; checkpoints and recovery
4. SSE bridge completion and CLI compatibility verification
5. Tests and documentation (API, setup, workflow examples)

## Deliverables
- FastAPI app with documented OpenAPI endpoints (no auth)
- SQLAlchemy models & Alembic migrations
- Queue workers and SSE streaming
- Test suite (unit/integration/perf) and setup docs
- Example configuration and a sample workflow JSON aligning with AF patterns