# qlaw-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://github.com/Qredence/qlaw-cli/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-f472b6.svg)](https://bun.sh)
[![Code of Conduct](https://img.shields.io/badge/Code%20of-Conduct-blueviolet.svg)](CODE_OF_CONDUCT.md)

![qlaw-cli interface](docs/assets/thumbnails.jpg)

> A modern, feature-rich terminal UI chat application with OpenAI integration, built with OpenTUI and React.

**👉 New here? Start with the [Quick Start Guide](./docs/QUICKSTART.md)** | ✋ Read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing

## ✨ Features

### Core Capabilities

- 🤖 **OpenAI/Azure Integration** - Streaming responses with OpenAI and Azure OpenAI support
- 💬 **Session Management** - Multiple conversations with persistent history
- ⚡ **Command System** - 10+ built-in commands + custom command support
- 🏷️ **Smart Mentions** - Context, file, code, and docs references
- 🎯 **Autocomplete** - Intelligent suggestion system with keyboard navigation
- 💾 **Settings Persistence** - Preferences saved across sessions

### User Experience

- 🎨 **Claude Code-Inspired Design** - Clean, professional interface with warm accents
- 📱 **Fully Responsive** - Adapts to any terminal size
- ⌨️ **Keyboard-Driven** - Efficient workflows without leaving the keyboard
- 📜 **Smart Scrolling** - Auto-scroll with visual feedback
- 🔧 **Overlay Menus** - Settings and session list overlays

### Built-in Commands

`/clear`, `/help`, `/settings`, `/export`, `/sessions`, `/new`, `/terminal-setup`, `/version`, `/quit`, and more

## 🚀 Quick Start

### Installation

**Install from npm:**

```bash
npm install -g qlaw-cli
```

**Or using other package managers:**

```bash
# Using yarn
yarn global add qlaw-cli

# Using pnpm
pnpm add -g qlaw-cli

# Using bun
bun add -g qlaw-cli
```

Then run from anywhere:

```bash
qlaw
```

### Development Setup

If you want to contribute or develop locally:

```bash
# Clone the repository
git clone https://github.com/Qredence/qlaw-cli.git
cd qlaw-cli

# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Add your OpenAI API key to .env
# OPENAI_API_KEY=your-key-here

# Run locally
bun run start

# Or with auto-reload during development
bun run dev
```

## 📖 Usage

### Getting Started

1. **Type your message** in the input field
2. **Press Enter** to send
3. **AI responds** with streaming support
4. **Use commands** by typing `/` for quick actions
5. **Add mentions** by typing `@` for context

### Commands

Type `/` to see available commands:

- `/clear` - Clear chat history
- `/help` - Show help information
- `/settings` - Open settings menu
- `/sessions` - View all sessions
- `/new` - Start new session
- `/export` - Export chat to JSON
- `/version` - Show version info
- `/quit` - Exit application

### Mentions

Type `@` for contextual references:

- `@context` - Add contextual information
- `@file` - Reference a file
- `@code` - Insert code snippet
- `@docs` - Link documentation

### Keyboard Shortcuts

- `↑` `↓` - Navigate suggestions
- `Tab` - Autocomplete suggestion
- `Enter` - Send message / Select suggestion
- `Esc` - Cancel input / Close overlays / Exit
- `Ctrl+C` - Force exit

## 📚 Documentation

- **[Quick Start Guide](./docs/QUICKSTART.md)** - Get up and running in 3 minutes
- **[Architecture](./docs/ARCHITECTURE.md)** - Technical design and structure
- **[UI Reference](./docs/UI-REFERENCE.md)** - Visual interface guide
- **[Design System](./docs/DESIGN.md)** - Colors, typography, and components
- **[Changelog](./docs/CHANGELOG.md)** - Version history

## 🗺️ Roadmap

### v0.2.0 (Planned)

- [ ] Plugin system for custom commands
- [ ] Markdown rendering in messages
- [ ] Code syntax highlighting
- [ ] File attachment support
- [ ] Theme customization
- [ ] Export to multiple formats

### v0.3.0 (Planned)

- [ ] Multi-model support (Claude, Gemini, etc.)
- [ ] Local LLM integration (Ollama)
- [ ] Voice input support
- [ ] Image analysis capabilities
- [ ] Advanced RAG with vector search

### Future

- [ ] Collaborative sessions
- [ ] Cloud sync
- [ ] Mobile companion app
- [ ] Plugin marketplace

## 🤝 Contributing

We welcome contributions! Please see:

- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** - Community standards
- **[Security Policy](./SECURITY.md)** - Reporting vulnerabilities
- **[Publishing Guide](./docs/PUBLISHING.md)** - For maintainers: How to publish releases to npm

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgements

**Inspiration:**

- **[Claude Code](https://claude.ai)** - Design inspiration for the clean, minimal interface and warm accent color scheme
- **[Cursor](https://cursor.sh)** - Terminal integration patterns and workflow concepts

**Built With:**

- **[OpenTUI](https://opentui.dev)** - The excellent terminal UI framework that powers this application
- **[React](https://react.dev)** - Component library for building the interface
- **[Bun](https://bun.sh)** - Fast JavaScript runtime and package manager
- **[TypeScript](https://typescriptlang.org)** - Type-safe development

Special thanks to the OpenTUI team for creating such a powerful and elegant framework for building terminal UIs.

---

**Made with ❤️ by [Qredence](https://github.com/Qredence)**
