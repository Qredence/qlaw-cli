## Overview
- Implement a progressive enhancement layer (no breaking changes) for the Workflows Getting Started pages, adding keyboard-accessible dropdowns, dark theme with persistence, structured Agents settings, role-aware messaging, and auto-scroll behavior.
- Keep existing markup and routes intact; augment via targeted DOM hooks and lightweight JS/CSS.

## Architecture
- Add `af-workflows-ui.css` with CSS variables and role-based styles.
- Add `af-workflows-ui.js` to initialize enhancements on pages within `python/samples/getting_started/workflows`.
- Use `data-af-*` attributes for non-invasive hooks on commands lists, agents settings panels, and messaging containers.
- Store user preferences and agent settings in `localStorage` namespaced keys.

## Commands Dropdown
- Apply `role="listbox"` to the commands container and `role="option"` to items.
- Implement roving tabindex with arrow key navigation (up/down) and Enter selection; Escape closes.
- Visual highlight via CSS class on selected item; maintain `selectedIndex` in JS.
- Smooth scrolling using `element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })` on selection change.

## Theme System
- Define dark theme tokens as CSS variables (backgrounds, text, borders, accents) and set dark as default on first load.
- Persist theme with `localStorage('af-theme')` and apply via `documentElement.dataset.theme`.
- Ensure all enhanced components consume variables; verify WCAG AA contrast ratios; provide visible focus outlines.

## Agents Settings
- Restructure `/agents` section into accordion categories: General, Model & Parameters, Tools, Workflow Edges/Executors, Advanced.
- Provide per-agent panels (Coder, Reviewer, Planner, Judge) with role badges, description, and icons.
- Editable fields validated via central JSON schemas (types/ranges/required); inline validation messages; disabled Save until valid.
- Tooltips/help text next to each configurable option; include links to foundational concepts (executors, edges, streaming).
- Save settings to `localStorage('af-agent-settings')`; optional Export/Import as JSON.

## Messaging View
- Render messages under a container with role-specific styles (avatar, badge, left-border accent) for Coder/Reviewer/Planner/Judge.
- Display role name, timestamp, and metadata (e.g., edge/event type) inline.
- Append streaming deltas to the active agent’s message; show spinner and a micro progress bar inline.

## Auto-Scroll Behavior
- Auto scroll to bottom with smooth animation when new messages arrive and the user is near the bottom.
- Suspend auto-scroll when the user manually scrolls up beyond a threshold; resume when they return.
- Handle window resize and message loading states with debounced recalculation.

## Error Handling
- Graceful fallbacks when `localStorage` is unavailable; dark theme remains default.
- Inline error banners for validation or network/streaming issues; non-blocking UI.

## Testing
- Unit: dropdown navigation (aria/selection), theme persistence, agents validation, messaging rendering.
- Integration: dropdown selection triggers actions; theme persists across reloads; agent edits save and validate; streaming appends with auto-scroll.
- End-to-End: critical flows across commands, theme toggle, agents configuration, running workflow and viewing messages.
- CI: GitHub Actions job to run unit/integration/e2e; cache dependencies; publish coverage.

## Documentation
- Technical docs: component architecture, CSS token system, DOM hooks, validation schemas.
- Setup: local dev instructions, how to add agent types and fields, theme extension.
- API/interfaces: document any new props/data attributes used by enhancements.
- Usage examples: keyboard navigation, configuring agents, viewing role-styled messages.
- Changelog: record enhancements and version bumps; note backward compatibility.

## Milestones
- Phase 1: Theme tokens & default dark theme; commands dropdown with keyboard nav and smooth scroll.
- Phase 2: Agents settings accordion, schemas, tooltips; persistence.
- Phase 3: Messaging view with role styling, avatars, timestamps; streaming UX.
- Phase 4: Auto-scroll implementation and edge-case handling.
- Phase 5: Tests, CI, and documentation.

## Backward Compatibility
- Enhancements activate only when JS is available; original content remains visible and usable.
- No changes to existing URLs or server-side code; progressive enhancement only.
