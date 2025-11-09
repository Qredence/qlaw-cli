# Contributing to qlaw-cli

First off, thank you for considering contributing to qlaw-cli! It's people like you that make qlaw-cli such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots or animated GIFs** if possible.
* **Include your environment details**: OS, terminal emulator, Bun version, etc.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Explain why this enhancement would be useful** to most qlaw-cli users.

### Pull Requests

* Fill in the required template
* Follow the TypeScript styleguide
* Include thoughtfully-worded, well-structured tests if applicable
* Document new code
* End all files with a newline
* Follow the existing code style

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/qlaw-cli.git
   cd qlaw-cli
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Create a branch for your changes**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Make your changes and test**
   ```bash
   # Run the basic version
   bun run start
   
   # Run with auto-reload
   bun run dev
   
   # Type check
   bun run typecheck
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   
   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - A new feature
   - `fix:` - A bug fix
   - `docs:` - Documentation only changes
   - `style:` - Changes that don't affect the code meaning (formatting, etc)
   - `refactor:` - Code change that neither fixes a bug nor adds a feature
   - `perf:` - Code change that improves performance
   - `test:` - Adding missing tests
   - `chore:` - Changes to the build process or auxiliary tools

6. **Push to your fork and submit a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Styleguide

### TypeScript Styleguide

* Use TypeScript for all new code
* Use meaningful variable names
* Add type annotations for function parameters and return values
* Use `const` by default, `let` when mutation is needed, avoid `var`
* Use arrow functions for callbacks and short functions
* Use async/await instead of promises when possible
* Add JSDoc comments for public APIs

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
    * 🎨 `:art:` when improving the format/structure of the code
    * 🐛 `:bug:` when fixing a bug
    * ✨ `:sparkles:` when adding a new feature
    * 📝 `:memo:` when writing docs
    * 🚀 `:rocket:` when improving performance
    * ✅ `:white_check_mark:` when adding tests
    * 🔒 `:lock:` when dealing with security

### Documentation Styleguide

* Use [Markdown](https://guides.github.com/features/mastering-markdown/)
* Reference function names, file names, and code with backticks: \`functionName()\`
* Use code blocks with language identifiers

## Project Structure

```
qlaw-cli/
├── src/
│   ├── index.tsx          # Basic chat interface
│   └── enhanced.tsx       # Enhanced version with command palette
├── examples/
│   ├── api-integration.tsx # Real API integration examples
│   └── README.md          # API integration guide
├── .github/
│   ├── workflows/         # CI/CD workflows
│   └── ISSUE_TEMPLATE/    # Issue templates
├── docs/
│   ├── ARCHITECTURE.md    # Technical architecture
│   ├── DESIGN.md          # Design system
│   └── QUICKSTART.md      # Quick start guide
└── package.json
```

## Testing

Currently, the project doesn't have automated tests, but we're working on it! If you'd like to contribute by adding tests, that would be very welcome.

## Additional Notes

### Issue and Pull Request Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Improvements or additions to documentation |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |
| `question` | Further information is requested |

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for your contribution! 🎉
