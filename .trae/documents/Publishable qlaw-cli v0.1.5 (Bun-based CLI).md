## Overview

- Make `qlaw-cli` immediately publishable at version `0.1.5` targeting Bun runtime, with a production build, help/version flags, tests, docs, and pre-publish checks.
- Keep interactive TUI as the default behavior; add lightweight CLI flag handling before TUI boot.

## Core Functionality

- Leave existing TUI/chat features intact.
- Add early CLI flag handling to `src/index.tsx`:
  - `--help` prints usage and exits (no TUI render)
  - `--version` prints `0.1.5` and exits
  - `--status` prints a condensed config summary and exits
- Ensure robust error boundaries in streaming and command execution paths already present; add a top-level try/catch around renderer startup that prints an error and exits with code 1.

## Command Structure & Help

- Centralize CLI help text in `src/commandHandlers.ts` or new `src/cliHelp.ts` utility.
- Map `/help` content into CLI `--help` output with a concise synopsis:
  - Usage, common flags (`--help`, `--version`, `--status`), and note: interactive TUI launches without flags.
- Reference locations:
  - Parser insertion point: `src/index.tsx:1–30` before `createRoot(renderer).render(<App />)`.
  - Help source: `src/commandHandlers.ts` currently implements `/help`.

## Package Configuration

- Update `package.json`:
  - Add `engines`: `{ "bun": ">=1.2.10" }`
  - Add `packageManager`: `"bun@1.2.10"`
  - Change `bin.qlaw` to `"./dist/index.js"` post-build
  - Add `files`: include `dist` (retain `src`, `README.md`, `LICENSE` if desired)
  - Add `exports`: `{ ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }` (optional)
  - Keep `publishConfig.access: "public"` and `provenance: true`
- Ensure `version` stays `0.1.5`.

## Build System

- Add Bun build scripts:
  - `"build": "bun build src/index.tsx --outdir dist --minify --sourcemap --target bun"`
  - Optional types: `"build:types": "bunx tsc -p tsconfig.json --emitDeclarationOnly --outDir dist"`
  - `"prepublishOnly": "bun run typecheck && bun test && bun run build && bun run build:types"`
- Verify `src/index.tsx` shebang remains `#!/usr/bin/env bun` for dev; built artifact will be JS in `dist/index.js`.

## Version Control Integration

- Confirm `.gitignore` covers `node_modules`, `dist`, `coverage`, logs, `.env`, caches, and artifacts (`bridge.db`) — already present.
- Add `.npmignore` (optional) to exclude non-distribution content if needed (e.g., `examples/`, `bridge/`, `docs/assets/`), while keeping docs.
- Ensure repository fields point to GitHub (already set).

## Testing Framework & Sample Tests

- Keep Bun test runner (`bun test`).
- Add tests:
  - `tests/cli/help.test.ts`: spawns the built `dist/index.js` with `--help` and asserts usage text
  - `tests/cli/version.test.ts`: asserts version output equals `0.1.5`
  - `tests/cli/status.test.ts`: asserts status output includes “Auto-scroll” and current theme
- Extend `scripts.check`: `"check": "bun run typecheck && bun test"` (already present).

## Documentation

- README.md: already present and comprehensive; verify install via npm and `qlaw` command.
- CHANGELOG.md: exists under `docs/CHANGELOG.md`; ensure entry for `0.1.5` (present).
- LICENSE: exists (MIT).
- Add short `docs/PUBLISHING.md` instructions (optional) for maintainers (login, tag, publish).

## Publishing Preparation

- Version tagging: create Git tag `v0.1.5`.
- Build artifacts: generate `dist/index.js`, maps, and `index.d.ts`.
- Registry configuration:
  - Use npm default registry or set `.npmrc` if publishing to GitHub Packages (optional). Keep `publishConfig.access: public`.
- Pre-publish validation:
  - Run `bun run prepublishOnly` (typecheck, tests, build)
  - Run smoke test: `node dist/index.js --help` should print usage; `bun run dist/index.js --help` also works if Bun-targeted build.

## Security & Best Practices

- Do not log secrets; mask API keys in `/status` (already implemented).
- Avoid bundling `.env`; ensure it’s ignored by `.gitignore`.
- Validate inputs for CLI flags; non-recognized flags should print help and exit with code 2.

## Rollout Steps

1. Implement CLI flag handling in `src/index.tsx` with early exit for `--help`, `--version`, `--status`.
2. Add error guard around renderer creation to fail fast with readable errors.
3. Update `package.json` with `engines`, `packageManager`, `bin` → `dist/index.js`, and build scripts.
4. Add optional `.npmignore` if we want to slim the package.
5. Create sample CLI tests in `tests/cli/*` and wire into Bun test.
6. Build with `bun run build` and verify `dist/index.js` runs `--help`.
7. Tag `v0.1.5`, run `bun run prepublishOnly`, then `npm publish --access public`.

## Validation Checklist

- `qlaw --help` prints usage without launching TUI
- `qlaw --version` prints 0.1.5
- `qlaw` launches interactive TUI when no flags
- `bun test` passes, including new CLI tests
- `npm pack` produces tarball containing `dist/`, `README.md`, `LICENSE` and excludes dev-only folders
- Smoke run from tarball’s `bin` works on fresh environment with Bun installed

## Notes

- This package targets Bun runtime for CLI. If Node support is desired later, we can add a Node-target build and gate OpenTUI initialization accordingly.
