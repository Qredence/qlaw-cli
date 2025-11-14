## Overview
- Implement a front-end enhancement layer for the Workflows Getting Started site, preserving existing content and routes while adding accessible UI components for commands, themes, agent settings, messaging, and scrolling.
- Maintain backward compatibility by using progressive enhancement (feature flags, non-invasive DOM hooks) and keeping API contracts stable.

## Current Context & Constraints
- The Agent Framework Workflows samples organize concepts around executors, edges, agents, and streaming. Agents and streaming traces are core primitives used throughout samples (Executors & Edges; Agents in a Workflow; Streaming basics).
- Web UI must reflect agent roles (Coder, Reviewer, Planner, Judge) and streaming events clearly, while preserving documentation-style browsing.

## Commands Dropdown Navigation
- Accessibility & ARIA:
  - Use a roving tabindex pattern on list items; apply `role="listbox"` and `role="option"` with `aria-selected`.
  - Arrow Up/Down moves selection; Enter confirms selection; Escape closes.
- Visual Highlighting:
  - Selected item uses focus ring and highlighted background; ensure high-contrast dark/light colors.
- Smooth Scrolling:
  - Use `Element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })` when selection moves.
  - Maintain internal index state with bounded scrolling for long lists.
- Keyboard Handling:
  - Attach `keydown` on focused dropdown; prevent default for handled keys; announce changes via `aria-live="polite"` for SR.

## Theme Configuration
- Dark Theme Default:
  - Define design tokens via CSS variables (`--bg-primary`, `--text-primary`, `--border`, etc.).
  - Set default theme to dark; on first load apply `localStorage.getItem('af-theme') ?? 'dark'`.
- Persistence:
  - On toggle, update `data-theme` on `document.documentElement` and persist to localStorage.
- Component Adaptation:
  - Ensure all UI elements (dropdown, panels, badges, message items) consume CSS variables for colors and spacing.
- Accessibility:
  - Enforce minimum contrast ratios (WCAG AA) for text vs backgrounds; test tokens against contrast checker; provide focus indicators.

## Agents Settings Enhancement (/agents)
- Structure & Format:
  - Align sections with agent-framework concepts: Agent Type, Parameters, Tools, Edges, Executors, Streaming.
  - Organize settings in expandable categories (accordion): General, Model & Parameters, Tools, Workflow Edges, Advanced.
- Detail Panels:
  - Per-agent cards (Coder, Reviewer, Planner, Judge) with description, role badge, icon/avatar.
- Editable Parameters:
  - Input controls with validation (required, type, ranges); use inline error text and tooltips.
  - Validation schemas defined centrally (JSON Schema per agent) to maintain consistency.
- Tooltips/Help:
  - Info icons next to each field; concise help text mapping to concepts used in the samples (executors, edges, streaming basics).

## Agent Messaging System
- Rendering:
  - Message list with role-specific styling and avatar/icon: Coder, Reviewer, Planner, Judge.
  - Each item shows role name, timestamp, and optional metadata (edge path, event type).
- Visual Style:
  - Distinct background accents or left border colors per role; accessible contrast.
- Streaming:
  - Append deltas to the current agent’s message; show a spinner and an inline progress micro-bar.

## Automatic Scrolling Behavior
- Scroll-to-bottom:
  - When new messages arrive and user is at or near bottom, auto-scroll with smooth animation.
- Preserve Manual Position:
  - If user scrolled up beyond a threshold, suspend auto-scroll until user returns near bottom.
- Edge Cases:
  - Recompute on window resize; handle message loading states; debounce resize events.

## Testing
- Unit Tests:
  - Dropdown keyboard navigation (roving tabindex, selection changes, aria attributes).
  - Theme persistence logic and CSS variable application.
  - Validation schemas for agent settings.
  - Messaging rendering with role badges and timestamps.
- Integration Tests:
  - Dropdown selection + enter triggers expected action.
  - Theme toggle persists and re-applies on reload.
  - Editing agent parameters shows validation and saves.
  - Streaming appends deltas and manages auto-scroll.
- End-to-End:
  - Critical flows: open commands, navigate and select; change theme; configure agents; run a workflow and see messages.
- CI/CD:
  - GitHub Actions job running unit/integration/e2e on PR; cache dependencies; report coverage.

## Documentation
- Technical Docs:
  - Architecture (components, state management, CSS variables), agent settings format, messaging rendering, scrolling logic.
- Setup:
  - Local development, theme tokens, how to add new agent types.
- API Changes:
  - Document any added endpoints or props (if applicable) while keeping existing APIs backward compatible.
- Usage Examples:
  - Keyboard navigation examples; theme toggle; configuring Coder/Reviewer; viewing streaming traces.
- Versioning & Changelog:
  - Record enhancements per release; migration notes (none expected due to backward compatibility).

## Implementation Plan
- Phase 1: Theme tokens & default dark theme; dropdown component with keyboard navigation & smooth scrolling.
- Phase 2: Agents settings page restructured with validation schemas and tooltips.
- Phase 3: Messaging system updates with role-specific styles, avatars, timestamps; streaming UX polish.
- Phase 4: Auto-scroll behavior with manual position preservation; resize handling.
- Phase 5: Tests (unit/integration/e2e) and CI setup; documentation authoring.

## Backward Compatibility & Error Handling
- Preserve existing routes/components; introduce new props/features as optional.
- Guard for missing localStorage; fall back to dark theme.
- Validation errors handled inline; form submission disabled until valid; provide error summaries.
- Streaming/network errors display inline, preserve scroll state, and provide retry.

## Visual & Accessibility Standards
- Follow WCAG AA contrast minimums; consistent focus rings; semantic roles and labels; keyboard-only complete operability.

Would you like me to proceed to implement these enhancements in the repository and open a PR with the changes and tests?