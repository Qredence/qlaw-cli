# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Code syntax highlighting support
- Message history persistence
- Export chat to markdown/JSON
- Multi-line input support
- File attachment support
- Session management improvements

## [0.1.3] - 2025-11-09

### Added

- Fuzzy autocomplete for commands and mentions with rich descriptions
- Interactive prompts overlay for confirmations and input (used by /clear, /model, /endpoint, /api-key)
- New commands: /endpoint, /api-key
- Theme system with light and dark palettes; /theme toggles live
- Streaming spinner indicator and elapsed seconds in status line during responses

### Changed

- Suggestions now come from a central registry and use fuzzy ranking instead of prefix-only filtering
- Introduced settings-backed keybindings for suggestion navigation (↑/↓, Tab) with a structured keymap

### Fixed

- Guarded mention autocomplete selection to avoid undefined access in edge cases

### Docs

- Added WARP.md tailored to this repo
- Added IMPLEMENTATION_PLAN.md for Enhanced Interactivity & Settings

## [0.1.0] - 2025-11-08

### Added

- Initial public release
- Interactive terminal chat interface built with OpenTUI and React
- Claude Code-inspired design with warm accent colors
- Message history with auto-scrolling
- Animated shimmer loader for AI responses
- Command system with 10+ built-in commands (`/clear`, `/help`, `/settings`, `/sessions`, `/new`, etc.)
- Mention system (`@context`, `@file`, `@code`, `@docs`)
- Smart input modes with autocomplete suggestions
- Keyboard shortcuts (Esc, Ctrl+C, arrow navigation, Tab completion)
- Settings configuration with persistence (theme, timestamps, auto-scroll)
- Session management with multiple conversations
- Custom command registration support
- OpenAI Responses API integration with streaming support
- Azure OpenAI compatibility
- Environment variable configuration
- Settings and sessions overlay menus
- Comprehensive documentation (README, QUICKSTART, ARCHITECTURE, DESIGN, UI-REFERENCE)
- Example API integration code
- MIT License

### Technical

- TypeScript support with strict type checking
- Bun runtime support
- React 19 integration
- OpenTUI core and React renderer
- Auto-reload development mode
- Type checking script

## [0.0.1] - 2025-11-07

### Added

- Initial project scaffolding
- Basic chat interface structure

---

## Release Notes

### [0.1.0] - Initial Public Release

This is the first public release of qlaw-cli, a modern terminal UI chat application. The project provides a clean, developer-friendly interface for building AI-powered chat applications in the terminal.

**Key Features:**

- Claude Code-inspired design with professional interface
- Flexible command and mention system with autocomplete
- Easy integration with OpenAI-compatible APIs
- Streaming response support
- Session management with persistent storage
- Settings persistence across sessions
- Comprehensive documentation and examples

**Getting Started:**

```bash
bun install
bun run start
```

See the [Quick Start Guide](QUICKSTART.md) for more details.

**Next Steps:**
We're planning to add syntax highlighting, better message history management, and more customization options in future releases.

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

[Unreleased]: https://github.com/qredence/qlaw-cli/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/qredence/qlaw-cli/releases/tag/v0.1.3
[0.1.0]: https://github.com/qredence/qlaw-cli/releases/tag/v0.1.0
[0.0.1]: https://github.com/qredence/qlaw-cli/releases/tag/v0.0.1
