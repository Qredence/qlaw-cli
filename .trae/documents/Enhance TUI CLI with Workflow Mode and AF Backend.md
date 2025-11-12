## Overview
- Adopt the existing OpenTUI React stack to deliver UX upgrades and workflow capabilities without introducing new dependencies.
- Integrate the Python Agent Framework bridge via current SSE client patterns, keeping UI and business logic separated.
- Preserve all current commands, mentions, sessions, settings, and streaming features.

## UX Enhancements
- Keyboard Navigation: Implement focus management for all interactive elements (input, suggestions, overlays, settings). Map keys via `useKeyboard` with clear bindings: arrows/tab/shift-tab to move focus; enter/space to activate; escape to close overlays; ctrl+k toggles debug console.
- Visual Hierarchy: Introduce consistent headings, status bar, and semantic grouping with OpenTUI `<box>` and `<text>`.
- Contextual Help & Tooltips: Add a Help overlay accessible via `/help` or `?` key; show contextual tips in overlays and settings using command metadata (source in `src/commands.ts`).
- Progress Indicators: Reuse spinner and add per-task progress bars in message list and overlays for long operations (model streaming, workflow steps).
- Color Scheme & Responsive Layout: Use `src/themes.ts` tokens; ensure layouts adapt to terminal dimensions from `src/utils.ts`. Make spacing, borders, and colors consistent.

## Workflow Mode
- Mode Toggle: Add `/mode standard|workflow` and a quick toggle key (e.g., `ctrl+m`). Visual indicator in status bar showing current mode.
- Workflow Core: Implement Node-side orchestration for agents (coder, planner, reviewer, judge) that delegates execution to the Python bridge. Represent each step as a streamed message with trace events.
- Mentions & Commands: Support `@coder`, `@planner`, `@reviewer`, `@judge` mentions to route prompts; add commands `/workflow`, `/agents`, `/run`, `/continue`, `/judge` to manage workflows.
- UI Overlays: Create a Workflow overlay to view pipeline, step statuses, and configure agents. Provide start/pause/resume controls.

## Backend Integration
- Use existing AF endpoints at `AF_BRIDGE_BASE_URL` (`POST /v1/responses`, `POST /v1/workflows/{entity_id}/send_responses`).
- Implement `workflowService`:
  - Start workflows, continue steps, and consume SSE; translate bridge RequestInfo/trace completions into UI updates.
  - Provide a clean API for the UI layer (start, continue, cancel, status).
- Maintain Separation:
  - UI components/overlays in `src/index.tsx` (and small UI-only modules).
  - Business logic in `src/workflow.ts` (service/controller), AF formatting helpers in `src/af.ts`.
- Error Handling: Unified error objects with user-friendly messages, retry logic, and safe rollback to standard mode.

## Configuration
- Extend `src/storage.ts` settings with `workflow.enabled`, `workflow.defaultAgents`, `workflow.keybindings` (toggle, start, pause, resume), and `workflow.options` (e.g., max steps, judge thresholds).
- Update Settings overlay to edit workflow configuration and keybindings; persist automatically.

## Quality Requirements
- Sub-100ms UI Interactions: Minimize state writes on keypress; memoize heavy render paths; batch message updates; avoid sync file IO on input. Spinner remains at 80ms cadence.
- 100% Keyboard Accessibility: Ensure every control has a focus target and keybinding; escape closes; arrows/tab cycle; announce focus in status line.
- Terminal Compatibility: Use only basic ANSI-safe elements; rely on OpenTUI primitives; adapt layout to `getTerminalDimensions` and avoid hard-coded widths.
- Comprehensive Logging: Add a lightweight `logger` with levels (debug/info/warn/error) that wraps `console` and renderer console; log backend requests/responses, mode toggles, and errors.

## Testing Requirements
- Unit Tests:
  - Keyboard focus manager and keybindings mapping.
  - `workflowService` start/continue/cancel and error paths (SSE mocked).
  - Storage settings extensions and persistence.
  - Help/tooltip mapping from command metadata.
- Integration Tests:
  - Full workflow scenario: planner→coder→reviewer→judge via mocked bridge and e2e using `bridge/run.sh`.
  - Mode toggle and UI behavior across overlays.
- Cross-Platform: Run tests under Bun on macOS and Linux; verify terminal dimension fallbacks.
- Performance Benchmarking: Measure render latency on keypress and message append; ensure <100ms target.

## Implementation Details
- Update `src/index.tsx`:
  - Add mode state, status bar indicator, help overlay, workflow overlay hooks, keybindings.
  - Integrate `workflowService` streaming outputs into message list with progress indicators.
  - Add contextual hints in overlays and command execution feedback.
- Add `src/workflow.ts`:
  - Export `startWorkflow`, `continueWorkflow`, `cancelWorkflow`, `getStatus` using SSE client patterns already used for OpenAI/AF.
  - Map bridge RequestInfo/trace events to UI events.
- Update `src/commands.ts` and `src/commandHandlers.ts`:
  - Register new commands (`/mode`, `/workflow`, `/agents`, `/run`, `/continue`, `/judge`).
  - Implement handlers that open overlays or call `workflowService`.
- Update `src/mentionHandlers.ts`:
  - Recognize `@coder`, `@planner`, `@reviewer`, `@judge` and route prompts accordingly.
- Update `src/themes.ts`:
  - Ensure tokens cover status bar, progress bars, overlays consistently.
- Update `src/storage.ts`:
  - Add workflow settings schema and persistence.
- Add `src/logger.ts`:
  - Provide simple leveled logging; hook to renderer console when available.

## Testing & Examples
- Add tests under `tests/` for new utilities, services, handlers, and overlays.
- Provide an e2e test using `examples/e2e-bridge.ts` extended for workflow mode scenarios.

## Milestones
- Phase 1: UX foundation (navigation, help, colors, progress) and mode toggle.
- Phase 2: `workflowService` and AF bridge orchestration (coder/planner/reviewer/judge).
- Phase 3: Configuration, logging, and robust error handling.
- Phase 4: Unit/integration tests, cross-platform checks, performance benchmarks.
- Phase 5: Polish, accessibility audit, terminal compatibility verification.

## Risks & Mitigations
- Bridge Availability: Detect and fallback to standard mode; clear error messaging; retry backoff.
- SSE Variability: Harden parser and add schema guards; capture trace events via `src/af.ts`.
- Render Performance: Memoize and batch updates; avoid synchronous IO during interactions.
- Terminal Differences: Use OpenTUI primitives only; dimension-based responsive layouts; test common emulators.
