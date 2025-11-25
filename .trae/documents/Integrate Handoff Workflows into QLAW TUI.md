## Overview

* Integrate Agent Framework handoff workflows into QLAW CLI, using the existing SSE streaming and AF bridge. Keep UI inline (no dialogs), preserve current commands and UX, and add workflow-specific controls and traces.

## Backend Assumption

* FastAPI bridge exposes:

  * `POST /v1/responses`, `POST /v1/workflows/{entity_id}/send_responses` for SSE streaming

  * `POST /v1/runs/{run_id}/handoff` for recording handoffs

  * `GET /v1/runs/{run_id}/status`, `GET /v1/runs/{run_id}/audit` for status/audit

* No authentication.

## TUI Commands & Mentions

* Add commands:

  * `/handoff <from> <to> [reason]` records a handoff and prints inline confirmation

  * `/continue` resumes the current workflow run via AF continue

  * `/wf-status` shows server-side status snapshot

  * `/wf-audit` shows recent audit events inline

* Mentions:

  * Preserve `@coder`, `@planner`, `@reviewer`, `@judge` for intent tagging; inline message formatting remains.

## UI Rendering

* Inline traces:

  * On `response.trace.complete` with `workflow_info/RequestInfoEvent`, show compact inline tips: awaiting agent, source executor, prompt summary.

* Agent-styled messages:

  * Map role badges/colors (Coder/Reviewer/Planner/Judge) in message headers; keep status line and progress bar.

* Auto-scroll:

  * If at bottom, smooth-scroll on new content; preserve position when user scrolls up.

## Integration Logic

* `src/workflow.ts`:

  * Add helpers to call `/v1/runs/{run_id}/handoff`, `/status`, `/audit`.

* `src/index.tsx`:

  * Track `currentRunId` per conversation; update when starting responses.

  * Wire `/handoff` to backend; display inline confirmation.

  * Wire `/continue` to `send_responses` endpoint (reuse existing AF bridge streaming path).

  * Render `RequestInfoEvent` traces concisely.

* `src/commandHandlers.ts`:

  * Implement handlers for `/handoff`, `/wf-status`, `/wf-audit`, `/continue` (inline messages only, no overlays).

* `src/commands.ts`:

  * Register new commands and descriptions; keep consistent help output.

* `src/storage.ts`:

  * Ensure AF bridge base URL/model available; optionally store last `run_id` per session.

## SSE Event Handling

* Continue using `parseSSEStream`:

  * `response.output_text.delta`: append to assistant message

  * `response.trace.complete`: format via `formatRequestInfoForDisplay` and append inline

  * `error`: append inline error banner

## Performance & Accessibility

* Keep sub-100ms interactions by batching state updates; memoize heavy renders.

* 100% keyboard: suggestions navigation unchanged; status line hints updated.

## Testing

* Unit:

  * Handlers for `/handoff`, `/wf-status`, `/wf-audit`, `/continue`

  * SSE trace formatting and display

* Integration:

  * Start → stream → handoff → continue → audit flow with mocked bridge

* Performance:

  * Measure keypress-to-render latency and streaming append under load.

## Deliverables

* Updated TUI code (index.tsx, commands, commandHandlers, workflow\.ts) with inline workflow controls

* Tests and minor docs in `/help` output for workflow usage

## Milestones

1. Command registration and inline help updates
2. Workflow service calls (`handoff`, `status`, `audit`) and run tracking in TUI
3. Inline trace rendering and agent-styled messages
4. Tests for new commands and SSE trace behavior
5. Performance verification and polish

