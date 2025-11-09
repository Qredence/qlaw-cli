# Implementation Plan — Enhanced Interactivity and Settings

Status: Draft (do not execute until approved)
Owner: TBD

1) Problem statement
- Enhance interactivity: richer autocomplete, interactive prompts/confirmations, better keyboard navigation, and clearer real‑time feedback.
- Implement a comprehensive, persistent settings experience: editable panel, themes, API config, and customizable keybindings.

2) Current state (from src/index.tsx unless noted)
- Command autocomplete & suggestions
  - Mode detection and suggestions list (prefix matching only):
    ```ts
    useEffect(() => {
      if (input.startsWith("/")) {
        setInputMode("command");
        const query = input.slice(1).toLowerCase();
        const builtInCommands = ["clear","help","model","settings","sessions","status","terminal-setup","commands","export","theme"];
        const customCommandNames = customCommands.map((c) => c.name);
        const allCommands = [...builtInCommands, ...customCommandNames];
        const filtered = allCommands.filter((cmd) => cmd.startsWith(query));
        setSuggestions(filtered);
      } else if (input.startsWith("@")) {
        setInputMode("mention");
        const query = input.slice(1).toLowerCase();
        const availableMentions = ["context", "file", "code", "docs"];
        const filtered = availableMentions.filter((m) => m.startsWith(query));
        setSuggestions(filtered);
      } else {
        setInputMode("chat");
        setSuggestions([]);
      }
    }, [input, customCommands]);
    ```
  - Dropdown rendering shows simple descriptions for built‑ins only.
  - Keyboard: up/down to navigate; Tab to autocomplete; Enter to submit/accept if visible.

- Interactive prompts/confirmations
  - None. System messages are printed (e.g., /help). Overlays exist only for sessions and settings.

- Keyboard navigation & shortcuts
  - Registered in one place via useKeyboard:
    ```ts
    useKeyboard((key) => {
      // suggestions: up/down, tab
      // escape closes overlays or exits
      if (key.ctrl && key.name === "k") renderer?.toggleDebugOverlay();
      if (key.ctrl && key.name === "c") renderer?.stop();
    });
    ```

- Real‑time feedback / indicators
  - Status line text only (processing vs. hints). Assistant placeholder uses a single bullet `●` when streaming starts.

- Settings persistence & panel
  - Persisted in localStorage: keys qlaw_settings, qlaw_sessions, qlaw_custom_commands.
  - defaultSettings seeded from env (OPENAI_*). Panel is read‑only info:
    ```ts
    const defaultSettings = { theme: "dark", showTimestamps: false, autoScroll: true, model: OPENAI_MODEL, endpoint: OPENAI_BASE_URL, apiKey: OPENAI_API_KEY };
    // In settings overlay: Model/Endpoint/API Key/Theme/Timestamps/Auto-scroll are displayed but not editable
    ```

- Themes/colors
  - Single COLORS palette. `settings.theme` can toggle, but no light palette and no theme application switch.

- API configuration management
  - `/model` exists; no `/endpoint` or `/api-key` commands. Status prints masked key.

- Custom keybindings
  - None; there is a `/terminal-setup` command that prints manual setup instructions.

3) Proposed changes (concise design)
A. Suggestions: fuzzy autocomplete + richer metadata
- Introduce a typed registry for commands and mentions.
  - New file: src/commands.ts exports `Command` [{name, description, handler?, keywords?}] and `getAllCommandNames()`.
  - New file: src/suggest.ts exports `fuzzyMatch(query, items)` returning ranked results with highlighted spans.
- Replace `startsWith` with fuzzy scoring over name+keywords; keep stable keyboard UX (↑/↓/Tab/Enter).
- Extend dropdown to show description for both built‑ins and custom commands; keep layout minimal.

B. Interactive prompts (confirm/input)
- New component: PromptOverlay (confirm yes/no and simple text input).
  - State: `prompt = { type: 'confirm'|'input', message, onConfirm, onCancel } | null`.
  - Keyboard: Enter=confirm, Esc=cancel; for input, normal typing with Enter submit.
- Use cases:
  - `/clear` -> confirm before clearing when messages > 0
  - `/export` -> confirm destination choice (for now: print JSON as before; later: choose file path)
  - Future: deleting custom commands

C. Keyboard navigation and shortcuts
- Add settings-backed keymap with defaults:
  - nextSuggestion: down
  - prevSuggestion: up
  - autocomplete: tab
  - toggleSettings: ctrl+, (or keep `/settings`)
  - toggleSessions: ctrl+s (optional)
  - toggleDebug: ctrl+k (existing)
  - exit: esc / ctrl+c (existing)
- Structure:
  - Extend `AppSettings` with `keybindings: Record<Action, KeySpec[]>` plus a small `matches(key, KeySpec)` helper.
  - Use keymap in `useKeyboard` instead of hardcoded checks. Persisted with the rest of settings.

D. Real‑time feedback and indicators
- Replace `●` with a spinner component (ASCII twirl) near assistant message header while streaming.
- Status line: show elapsed seconds since request start (already tracked in state) and hint when suggestions are visible.
- Subtle visual indicator for network errors (e.g., [Error] stays but prefix with "⚠").

E. Settings implementation
- Make Settings overlay interactive:
  - Focusable list with arrow navigation; Enter/Space toggles; typing opens inline editors for text fields (model, endpoint, api key) with masked display for key.
  - Add `/endpoint <url>` and `/api-key <key>` commands mirroring `/model` behavior.
- Themes:
  - New file: src/themes.ts with DARK and LIGHT palettes; `getTheme(settings.theme)` returns COLORS used by UI.
  - Replace direct COLORS import with `const COLORS = useMemo(() => getTheme(settings.theme), [settings.theme])`.
- Persistence:
  - Extend `AppSettings` with `version` and `keybindings`; add `migrateSettings(v)` to handle future changes.

4) Minimal API/surface changes
- Types
  - AppSettings += { version: number; keybindings: Record<string, KeySpec[]> }
  - New `Command`/`CommandRegistry` types.
- New files
  - src/commands.ts, src/suggest.ts, src/themes.ts, src/ui/PromptOverlay.tsx (directory optional)
- src/index.tsx
  - Import registries/utils; swap COLORS for theme getter; wire prompt overlay; use keymap.

5) Phasing & acceptance criteria
- Phase 1: Fuzzy suggestions + registry
  - Criteria: `/h` suggests `help`; partials and typos (e.g., `stt`) rank `status`/`settings`; descriptions render for all items.
- Phase 2: Prompt overlay + guarded actions
  - Criteria: `/clear` requests confirmation when messages exist; Esc cancels; Enter confirms.
- Phase 3: Interactive settings + commands
  - Criteria: Values editable from overlay and via `/model`, `/endpoint`, `/api-key`; persisted and reflected in status.
- Phase 4: Themes
  - Criteria: `/theme` toggles palettes; UI colors switch without restart; at least DARK and LIGHT.
- Phase 5: Keybindings
  - Criteria: Keymap drives navigation; user-edited bindings persist and take effect.

6) Out of scope (for now)
- Executing external custom commands, file export destinations, multi-theme library, internationalization.

7) OpenTUI reference notes (implementation hooks)
- Components in use: `box`, `scrollbox`, `text`, `input`. Use absolute-positioned `box` with `style.position="absolute"` and `zIndex` for overlays (sessions, settings, prompt). Keep main input at bottom.
- Renderer utilities: `useRenderer()` exposes `renderer.toggleDebugOverlay()`, `renderer.console.toggle()`, and `renderer.stop()`. Reuse these for Ctrl+K debug and exits.
- Keyboard: `useKeyboard` provides `{ name, ctrl, alt, shift }`. Define `KeySpec = { name: string; ctrl?: boolean; alt?: boolean; shift?: boolean }` and a `matches(key, spec)` helper to drive actions from settings-backed keymap.
- Focus management: Drive focus with the `input` component's `focused` prop. When overlays (settings/prompt) are open, render an overlay-local `<input focused />` and set the bottom input to `focused={false}`.
- Styling/themes: Components accept `fg` and `backgroundColor`. Centralize colors with `getTheme(settings.theme)` and memoize: `const COLORS = useMemo(() => getTheme(settings.theme), [settings.theme])`.
- Scrolling: Maintain a `scrollBoxRef` and call `scrollBoxRef.current.scrollToBottom?.()` on new messages when `settings.autoScroll` is enabled.
- Streaming indicator: No built-in spinner; implement a simple ASCII twirl via `useEffect` + `setInterval` updating a small state near the assistant header; clear it in `onDone`.
- Errors: Continue annotating the in-progress assistant message with `[Error]` (and a small icon like "⚠") to keep context inline within the `scrollbox`.
