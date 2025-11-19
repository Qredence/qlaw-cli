# qlaw-cli: Agent Framework Handoff Workflow Support — Implementation Plan

Problem statement
- Goal: Enable qlaw-cli to run Agent Framework handoff workflows end-to-end, including handling RequestInfoEvent prompts and sending user responses back into the workflow loop.
- Today qlaw-cli streams plain chat completions from a Responses API-compatible endpoint and has no concept of Agent Framework workflow events or human-in-the-loop responses.

Current state
- qlaw-cli transport and streaming
  - File: src/index.tsx
  - Behavior: Posts to {OPENAI_BASE_URL}/responses and parses only common OpenAI events; workflow events are ignored.
  - Snippet (handled events):
    ```ts path=/Volumes/Samsung-SSD-T7/Workspaces/Github/qredence/agent-framework/v0.5/qlaw-cli/src/index.tsx start=151
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          ...
          if (
            currentEvent === "response.output_text.delta" ||
            currentEvent === "message.delta" ||
            currentEvent === "response.delta"
          ) {
            const delta =
              payload?.delta ??
              payload?.text ??
              payload?.content ??
              payload?.output_text?.delta ??
              "";
            if (delta) onDelta(delta);
          } else if (currentEvent === "response.error") {
            ...
          } else if (currentEvent === "response.completed") {
            ...
          } else if (payload && typeof payload === "object") {
            const fallback = payload?.delta ?? payload?.text ?? payload?.content;
            if (typeof fallback === "string" && fallback) onDelta(fallback);
          }
    ```
  - No UI/state for pending requests; input always triggers a new Responses API turn.

- Agent Framework handoff workflow
  - File: python/packages/core/agent_framework/_workflows/_handoff.py
  - HandoffUserInputRequest and gateway
    ```python path=/Volumes/Samsung-SSD-T7/Workspaces/Github/qredence/agent-framework/agent-framework/python/packages/core/agent_framework/_workflows/_handoff.py start=119
    @dataclass
    class HandoffUserInputRequest:
        conversation: list[ChatMessage]
        awaiting_agent_id: str
        prompt: str
        source_executor_id: str
    ...
    class _UserInputGateway(Executor):
        ...
        @handler
        async def request_input(self, conversation: list[ChatMessage], ctx: WorkflowContext) -> None:
            request = HandoffUserInputRequest(
                conversation=list(conversation),
                awaiting_agent_id=self._starting_agent_id,
                prompt=self._prompt,
                source_executor_id=self.id,
            )
            await ctx.request_info(request, object)
    ```
  - RequestInfoEvent payload structure
    ```python path=/Volumes/Samsung-SSD-T7/Workspaces/Github/qredence/agent-framework/agent-framework/python/packages/core/agent_framework/_workflows/_events.py start=206
    class RequestInfoEvent(WorkflowEvent):
        def __init__(self, request_id: str, source_executor_id: str, request_data: Any, response_type: type[Any]):
            super().__init__(request_data)
            self.request_id = request_id
            self.source_executor_id = source_executor_id
            self.request_type: type[Any] = type(request_data)
            self.response_type = response_type
        def to_dict(self) -> dict[str, Any]:
            return {
                "data": encode_checkpoint_value(self.data),
                "request_id": self.request_id,
                "source_executor_id": self.source_executor_id,
                "request_type": serialize_type(self.request_type),
                "response_type": serialize_type(self.response_type),
            }
    ```
  - Continuation API (programmatic):
    - Workflows resume via `workflow.send_responses(...)` / `send_responses_streaming(...)`, keyed by request_id.
    ```python path=/Volumes/Samsung-SSD-T7/Workspaces/Github/qredence/agent-framework/agent-framework/python/packages/core/agent_framework/_workflows/_workflow.py start=660
    async def send_responses(self, responses: dict[str, Any]) -> WorkflowRunResult:
        ... async for event in self._run_workflow_with_tracing(
              initial_executor_fn=functools.partial(self._send_responses_internal, responses),
              reset_context=False,
        )
    ```

- Reference: handoff_specialist_to_specialist.py (to mirror behavior)
  - File: python/samples/getting_started/workflows/orchestration/handoff_specialist_to_specialist.py
  - Event processing and continuation loop follow this pattern:
    ```python path=/Volumes/Samsung-SSD-T7/Workspaces/Github/qredence/agent-framework/agent-framework/python/samples/getting_started/workflows/orchestration/handoff_specialist_to_specialist.py start=195
    events = await _drain(
        workflow.run_stream("I need help with order 12345. I want a replacement and need to know when it will arrive.")
    )
    pending_requests = _handle_events(events)

    # Process scripted responses
    while pending_requests and response_index < len(scripted_responses):
        user_response = scripted_responses[response_index]
        responses = {req.request_id: user_response for req in pending_requests}
        events = await _drain(workflow.send_responses_streaming(responses))
        pending_requests = _handle_events(events)
    ```
  - RequestInfoEvent is surfaced to the app, which then sends a response map keyed by `request_id` via `send_responses_streaming`. qlaw-cli must replicate this HIL loop via its transport.

- DevUI (OpenAI-compatible API for agents/workflows)
  - File: python/packages/devui/agent_framework_devui/_server.py
  - Exposes `POST /v1/responses` for streaming execution; no route for `send_responses`.
  - Workflow event mapping to streaming events:
    - Most workflow events → `response.workflow_event.complete`
    - RequestInfoEvent specifically mapped to a trace event for now:
      ```python path=/Volumes/Samsung-SSD-T7/Workspaces/Github/qredence/agent-framework/agent-framework/python/packages/devui/agent_framework_devui/_mapper.py start=781
      if event_class in ["WorkflowStatusEvent", "WorkflowWarningEvent", "WorkflowErrorEvent", "RequestInfoEvent"]:
          ...
          trace_event = ResponseTraceEventComplete(
              type="response.trace.complete",
              data={
                  "trace_type": "workflow_info",
                  "event_type": event_class,
                  "data": event_data,  # includes request_info for RequestInfoEvent
                  ...
              },
          )
      ```
  - Implication: Clients can detect a RequestInfoEvent via `response.trace.complete` with `data.event_type === "RequestInfoEvent"`, but DevUI does not yet offer an HTTP endpoint to send responses back to the in-process workflow.

Proposed changes
- qlaw-cli frontend and transport
  1) Add Agent Framework mode (config)
     - New settings: `AF_ENABLED` boolean or auto-detect via presence of AF-specific events, and `AF_SHOW_WORKFLOW_EVENTS` to toggle visualization.
     - Optionally expose via `/settings` UI; mirror from env like existing OPENAI_*.
  2) Extend SSE parser to handle AF events
     - Recognize and parse:
       - `response.workflow_event.complete`
       - `response.trace.complete` where `data.trace_type === "workflow_info"`
       - Optional: `response.output_item.added/done` items with `{ type: "executor_action", executor_id, status }` for lightweight executor status display.
     - When a RequestInfoEvent is detected, extract minimal fields:
       - request_id, source_executor_id, and request_data (if `HandoffUserInputRequest`, use `.prompt` and display conversation snapshot).
     - Enter a new UI state: pending AF request.
       - Show a small overlay: “Workflow requests your input” with last few messages and prompt.
       - Store `pendingRequest = { requestId, sourceExecutorId, conversationSnapshot, prompt }` in state (support multiple pending by queue if needed).
       - Disable normal “send message” path while pending unless user is explicitly answering the request.
  3) Add “handoff response” submission path in qlaw-cli
     - When `pendingRequest` exists, the next user submit should call a dedicated “send response” transport instead of starting a fresh /responses run.
     - Provide a minimal UX affordance: show “[enter to respond] • Esc to cancel”. If canceled, clear/hide pending state (configurable: hide-only vs. cancel-and-keep-pending).

- Bridge API (MVP) for workflow run and continuation (streaming)
  Goal: Replicate the sample loop from handoff_specialist_to_specialist.py using HTTP + SSE, so qlaw-cli can both start the workflow and send further responses.

  1) Start/run endpoint (OpenAI Responses-compatible)
     - POST /v1/responses (SSE)
     - Request body (subset of OpenAI Responses):
       - model: string (entity/workflow id, e.g. "multi_tier_support")
       - input: string | list (initial user message or structured input)
       - stream: true
       - conversation: string | { id: string } (used to bind to a persistent workflow session)
     - Streamed events include:
       - Standard OpenAI deltas for assistant text
       - DevUI-style workflow events if present: `response.workflow_event.complete`
       - RequestInfoEvent as: `response.trace.complete` with
         { trace_type: "workflow_info", event_type: "RequestInfoEvent", data: { request_info: { request_id, source_executor_id, request_type, response_type, data } } }
       - Where `data` holds a serialized HandoffUserInputRequest with:
         { conversation: [ { role, author_name?, text } ... ], awaiting_agent_id, prompt, source_executor_id }

  2) Continuation endpoint (send_responses_streaming equivalent)
     - POST /v1/workflows/{entity_id}/send_responses (SSE)
     - Body: { responses: { [request_id: string]: any }, conversation?: string | { id: string } }
       - In handoff, values are typically strings (user input). Multiple pending requests supported via map.
     - Stream events are identical in shape to the run endpoint.

  Notes
  - This mirrors the Python sample:
    - First call maps to `workflow.run_stream(initial_message)`
    - Continuation maps to `workflow.send_responses_streaming({ request_id: user_response })`
  - Session affinity: conversation id binds requests to the same in-memory workflow instance.

- qlaw-cli changes (detailed)
  1) Event parsing and routing
     - In current SSE loop inside `streamResponseFromOpenAI`, add handlers for:
       - event === "response.workflow_event.complete" → optional log/ignore for MVP
       - event === "response.trace.complete" with payload.data.trace_type === "workflow_info"
         - If payload.data.event_type === "RequestInfoEvent":
           - Extract request = payload.data.data?.request_info || payload.data.request_info
           - Normalize to: { requestId, sourceExecutorId, prompt, conversation }
           - Set `pendingRequest`
  2) State machine additions
     - States: Idle → Running → AwaitingUserInput (pendingRequest) → Continuing → Running → [repeat | Terminated]
     - When AwaitingUserInput: disable normal chat submit and switch submit path to continuation.
  3) UI overlay (reuse existing overlay pattern)
     - Title: "Workflow requests your input"
     - Prompt text from request.prompt
     - Show last N messages from request.conversation (author_name or role, text)
     - Controls: Enter to submit, Esc to cancel/hide
  4) Submit path selection
     - If `pendingRequest` exists:
       - Call POST {AF_BRIDGE_BASE_URL}/v1/workflows/{modelId}/send_responses with body { responses: { [requestId]: userInput }, conversation }
       - Stream and process events like initial run; clear or update `pendingRequest` based on new events
     - Else:
       - Use existing POST {OPENAI_BASE_URL}/responses
  5) Configuration
     - Add env/setting: `AF_BRIDGE_BASE_URL` (when set, enables AF mode)
     - Add setting: `AF_MODEL` (entity/workflow id to use as the model field)
     - Auto-detect mode: if a RequestInfoEvent is observed, switch to AF mode for that session

Acceptance criteria
- Start a handoff workflow via qlaw-cli; when the coordinator or specialist triggers RequestInfoEvent, the overlay appears, showing prompt and recent messages.
- Submitting a response continues the workflow; subsequent events render in the transcript; the overlay clears or reappears on further requests.
- Final termination yields a cleaned conversation snapshot, and no pending requests remain.
- Matches the behavioral flow of the reference sample (start → pending requests → responses → completion).

- Backend integration options (choose one; A is recommended for speed)
  - A) Minimal Python bridge service (recommended MVP)
    - Small FastAPI app (separate process) that:
      - POST /v1/responses → begins a run by calling `workflow.run_stream(...)` and streaming events (compatible with current qlaw-cli).
      - POST /v1/workflows/{id}/requests/{request_id}/responses → calls `workflow.send_responses_streaming({ request_id: <text> })` and streams continuation events.
      - Holds workflow instance(s) and runner context in memory keyed by a session/conversation id.
    - Benefit: Doesn’t require modifying agent-framework; qlaw-cli changes remain minimal.
    - Config: new `AF_BRIDGE_BASE_URL` used only when `pendingRequest` flow triggers.
  - B) Local embedded runner (Node→Python child process)
    - Spawn a Python process per session that runs a small script to manage: start, stream, request, respond, and exit; communicate via stdio or ephemeral HTTP port.
    - Higher complexity (process lifecycle, ports), but no external service needed.
  - C) DevUI extension (future)
    - If/when DevUI exposes an API to continue a workflow run (send_responses), qlaw-cli can target that endpoint directly and drop the custom bridge.

- UI/State updates in qlaw-cli
  - New state members: `pendingRequest` and minimal workflow event log (optional).
  - Overlay rendering for handoff prompts (use existing overlay pattern from settings/session list).
  - Command additions:
    - `/status` to include AF mode and pending request state.
    - Optional `/handoff-cancel` to clear pending and resume normal chat.

Validation and testing
- Local test against a trivial HandoffBuilder workflow exposed by the bridge service; verify:
  - Initial run: stream shows executor events; RequestInfoEvent is detected; overlay appears; the app enters pending state.
  - Submit response: response is delivered to bridge; new stream events arrive; pending clears or repeats depending on workflow.
  - Termination: final output appears and no pending requests remain.

Open questions and assumptions
- DevUI currently surfaces RequestInfoEvent as trace; we’ll handle both `response.trace.complete` (workflow_info/RequestInfoEvent) and fallback `response.workflow_event.complete` if introduced later.
- Session management: We’ll key bridge-side workflow instances by a conversation id; qlaw-cli can pass a conversation token via existing OpenAI `conversation` parameter or via bridge-specific query/body.
- Security: Bridge is intended for local development only (similar stance to DevUI).

Next steps (MVP scope)
1) qlaw-cli: Implement AF event parsing + pending request UI state + conditional response submission path (no visual executor graph; keep lightweight).
2) Provide a minimal Python bridge (reference implementation) and configuration knobs in qlaw-cli to enable it.
3) Manual test with a simple handoff sample; iterate on event parsing edge cases.
