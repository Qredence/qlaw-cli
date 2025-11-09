# qlaw-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/qredence/qlaw-cli/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-f472b6.svg)](https://bun.sh)
[![Code of Conduct](https://img.shields.io/badge/Code%20of-Conduct-blueviolet.svg)](CODE_OF_CONDUCT.md)

An interactive terminal UI chat application built with OpenTUI and React, similar to OpenCode or Claude Code.

> **Note**: Add a screenshot or demo GIF here to showcase the application!
> You can use tools like [Asciinema](https://asciinema.org/) to record terminal sessions.

**👉 New here? Start with the [Quick Start Guide](./QUICKSTART.md)**  |  ✋ Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Features

- 🎨 **Polished monochrome design** - Clean aesthetic with cyan accent
- 💬 **Interactive chat interface** - Smooth message history with visual hierarchy
- ✨ **Animated shimmer loader** - Elegant loading indicator
- ⚡ **Command system** - Type `/` for commands (clear, help, settings, export)
- 🏷️ **Mention system** - Type `@` for mentions (context, file, code, docs)
- 🎯 **Smart input modes** - Auto-detects commands and shows suggestions
- 📜 **Auto-scrolling** - Always stays at the latest message
- ⌨️ **Keyboard shortcuts** - Minimal, intuitive controls
- 🔧 **Settings** - Toggle timestamps, theme, auto-scroll
- 📱 **Responsive** - Adapts to any terminal size

## Installation

```bash
bun install
```

## Running

### Basic Version

Simple chat interface with core features:

```bash
bun run start
# or with auto-reload
bun run dev
```

### Enhanced Version

Full-featured version with command palette and advanced features:

```bash
bun run enhanced
# or with auto-reload
bun run dev:enhanced
```

## Version Comparison

| Feature | Basic | Enhanced |
|---------|-------|----------|
| Chat interface | ✅ | ✅ |
| Message history | ✅ | ✅ |
| Auto-scrolling | ✅ | ✅ |
| Keyboard shortcuts | ✅ | ✅ |
| Command palette | ❌ | ✅ |
| System messages | ❌ | ✅ |
| Context-aware responses | ❌ | ✅ |
| Message counter | ❌ | ✅ |
| Clear chat command | ❌ | ✅ |

## Usage

### Basic Controls

- Type your message in the input field at the bottom
- Press **Enter** to send your message
- The AI will respond after a brief delay
- Press **Esc** to exit the application

### Commands & Mentions

**Commands** (type `/` to activate):
- `/clear` - Clear all messages
- `/help` - Show help information
- `/settings` - Toggle timestamps on/off
- `/export` - Export chat history
- `/theme` - Toggle theme (coming soon)

**Mentions** (type `@` to activate):
- `@context` - Add contextual information
- `@file` - Reference a file
- `@code` - Insert code snippet
- `@docs` - Link documentation

### Keyboard Shortcuts

- `Esc` - Exit application
- `Ctrl+K` - Toggle debug console
- `Ctrl+C` - Exit application

## Extending

To integrate with a real API:

1. Replace the `setTimeout` mock in `handleSubmit` with an actual API call
2. Add streaming support for real-time responses
3. Implement message history persistence
4. Add support for code blocks, markdown, and rich formatting

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
