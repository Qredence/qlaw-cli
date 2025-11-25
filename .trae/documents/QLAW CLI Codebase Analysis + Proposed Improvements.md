## Goals
- Elevate terminal UX/UI using OpenTUI + React, independent of any bridge.
- Keep streaming optional via OpenAI Responses API later, but design UI to be fully functional offline.
- Improve discoverability, ergonomics, accessibility, and visual polish without sacrificing performance.

## Baseline & Constraints
- Framework: `@opentui/core` + `@opentui/react` with Yoga layouts and timeline animations.
- Current components: `Header`, `MessageList`, `InputArea`, `SuggestionList`, `SettingsMenu`, `SessionList`.
- Remove bridge‑specific copy and workflows from the primary UX; retain only if explicitly enabled.

## UX Pillars
- Commandability: fast keyboard flows, rich command palette, predictable focus management.
- Readability: high‑contrast themes, consistent spacing, styled code blocks with syntax highlighting.
- Responsiveness: Yoga flex layouts with percentage widths and `useTerminalDimensions` for adaptive sizing.
- Feedback: subtle animations for progress/streaming using `useTimeline`; clear error surfaces without noise.

## Feature Improvements
### Command Palette & Suggestions
- Replace simple list with a palette: name, description, keywords, pinned items, and recent history.
- Fuzzy‑match highlighting in results; keyboard navigation with wrap‑around and page‑wise scrolling.
- Quick‑help column showing usage for the currently focused command.

### Input Area
- Contextual placeholders per mode (chat vs command/mention) and inline hint row.
- Mention chips (`@file`, `@code`) rendered inline with distinct borders/fg colors; backspace deletes chip.
- Multiline editing polish: line‑wrap marks and Shift+Enter guidance.

### Message Rendering
- Code blocks styled with `SyntaxStyle`; optional border and padding; copy affordance via visible hint.
- Optional timestamps and author badges; configurable in Settings.
- Auto‑scroll stabilizer: maintain view when user scrolls up; explicit “jump to latest” control.

### Header & Status Line
- Emphasize `STANDALONE` mode; show model/endpoint only if configured.
- Streaming indicator with spinner animation using `useTimeline`; condensed status spacing.

### Overlays
- SettingsMenu: tabbed sections (General, Appearance, Shortcuts) with live theme preview.
- SessionList: search, sort (updatedAt), rename/delete; keyboard shortcuts and focus persistence.
- Keyboard help overlay toggled via `?` or `ctrl+k` summarizing common actions.

### Themes & Accessibility
- Add at least one new theme (e.g., Solarized/Dracula) with accessible contrast targets.
- Expand theme tokens for borders, code backgrounds, accent spacing; ensure consistent fg/bg.

## Architecture Changes (Bridge‑Free)
- Gate workflow/agents UI behind `settings.workflow.enabled`; default off.
- Decouple network layer: keep OpenAI Responses client optional and dormant until configured.
- Normalize persistence I/O with `fs/promises` wrappers for cross‑runtime compatibility.

## Technical Implementation
### Components & Layout
- Convert complex areas to declarative composition where focus delegation is needed; reserve imperative for custom renderables.
- Use `scrollbox` for long lists (messages, sessions) with custom scrollbar styling.
- Apply Yoga flex layouts and percentage‑based widths to keep structure responsive across terminal sizes.

### Palette & Input
- Implement palette using `select` inside a `scrollbox` with pinned and recent sections.
- Add fuzzy highlight function to decorate matching substrings in `text` children.
- Render tokens for mentions as small `box` chips; maintain a token model alongside raw input.

### MessageList & Code
- Integrate `SyntaxStyle` with tree‑sitter assets for JS/TS/JSON/Markdown; allow toggling highlight level.
- Introduce copy hint text; map to a keyboard shortcut (e.g., `y` yank last block).

### Header & Feedback
- Replace manual spinner with `useTimeline` animated subtle progress bar; expose explicit `isProcessing` flag.
- Status collapse logic to compress secondary fields when terminal width is narrow.

### Overlays & Settings
- Build tabbed Settings with three sections; wire `onChange` to live preview of theme tokens.
- Extend keybindings editor with validation and summary rendering.
- Enhance SessionList with inline actions and type‑ahead search.

### Themes
- Add new theme tokens: `bg.panel`, `bg.code`, `text.tertiary`, `accent.border`.
- Provide a theme factory ensuring accessible contrast; unit snapshots for tokens.

## Testing
- Component tests for palette, input chips, listbox/scroll, and header status behaviors.
- Snapshot tests for themes and header variations at different terminal widths.
- Behavior tests for input multiline handling, fuzzy highlight correctness, and auto‑scroll policy.
- Optional mock streaming tests to ensure spinner/animation hooks do not block input.

## Documentation Updates
- Update in‑app help overlay with keyboard map and palette usage.
- README section: how to enable optional OpenAI streaming and configure model/endpoint.

## Risks & Mitigations
- Performance on large message lists → use `scrollbox` and avoid excessive re‑renders; memoize heavy sections.
- Accessibility regression → enforce contrast checks in theme tokens; keep focus indicators clear.
- Cross‑runtime file I/O → normalize on `fs/promises` with graceful fallback.

## Deliverables
- Enhanced palette, input, message rendering, header, overlays, themes.
- Test suites for new components and behaviors; CI runs `bun test`.
- Minimal doc changes for optional streaming configuration and keyboard help.

## Next Step
- On approval, proceed to implement the palette and input enhancements first, followed by message rendering and header updates, then overlays and themes, and finally tests and docs.