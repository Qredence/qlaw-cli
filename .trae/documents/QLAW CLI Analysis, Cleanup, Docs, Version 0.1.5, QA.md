## Scope & Approach
- Perform static analysis across `src`, `tests`, `web-ui`, `bridge`, and `.github/workflows`.
- Standardize package management on Bun, remove duplicates, and tighten CI.
- Refactor small architectural hotspots while preserving behavior.
- Update docs and release artifacts to match the current implementation.
- Bump all versions to `0.1.5` (patch), validate backward compatibility, and run full QA.

## Findings Summary
- Package management: both `bun.lock` and `package-lock.json` present → standardize on Bun and remove npm lock to avoid drift.
- CI coverage: `ci.yml` runs typecheck only, no tests → add `bun test` and artifact reporting.
- Caching mismatch: CI caches `bun.lockb` while repo has `bun.lock` → fix cache key.
- Unused dependency: `applicationinsights` referenced only in lockfiles and `package.json`, not imported anywhere → remove or integrate consistently.
- Environment docs: AF bridge variables used in code (`src/api.ts:7–8`) missing in `.env.example` → add `AF_BRIDGE_BASE_URL`, `AF_MODEL` to template.
- Tracked runtime artifact: `bridge.db` exists at repo root and isn’t ignored → move to `.gitignore` and delete from VCS.
- Architecture: `src/index.tsx` is large but many concerns moved to services/components; opportunity to tighten separation (streaming/command/UI composition) without functional changes.
- Documentation drift: Architecture doc still describes older patterns (header, mock API examples) and outdated file size; README version badge points to `0.1.4`.
- Testing: Healthy coverage across commands, SSE, AF formatting, UI helpers; add targeted tests for `streamingService.ts` and `commandService.ts`.

## Codebase Cleanup Plan
- Package manager standardization
  - Remove `package-lock.json` and rely on Bun (`bun.lock[b]`).
  - Regenerate Bun lock if needed; ensure `bun.lockb` is committed for modern Bun versions.
  - Update `.github/workflows` cache keys to match actual lockfile.
- Dependencies hygiene
  - Remove `applicationinsights` or add minimal integration via `src/logger.ts` and opt-in env var; default to off to avoid side effects.
  - Verify `peerDependencies` and `devDependencies` minimality; keep `@types/bun`, `typescript` only.
- Repo hygiene
  - Add `bridge.db` to `.gitignore`; remove tracked file.
  - Ensure `out/`, `dist/` remain ignored; keep `.npmignore` aligned with `files` field in `package.json`.
- Separation of concerns
  - Keep `streamingService.ts` and `commandService.ts` as dedicated modules.
  - Extract small UI composition helpers from `src/index.tsx` (no behavior change).
  - Avoid introducing new frameworks; follow existing OpenTUI/React patterns.

## Documentation Update Plan
- README
  - Update version badge and release references to `0.1.5`.
  - Clarify Bun-first install while retaining npm/yarn/pnpm guidance.
- CHANGELOG & Release Notes
  - Move `Unreleased` items into `0.1.5` with a concise list of cleanup and CI changes.
  - Add `docs/releases/v0.1.5.md` to mirror prior releases.
- ARCHITECTURE
  - Refresh project structure diagram and descriptions to current modules (`services/streamingService.ts`, `services/commandService.ts`).
  - Remove stale header/mock examples; reflect SSE streaming and AF bridge flow.
- `.env.example`
  - Add `AF_BRIDGE_BASE_URL` and `AF_MODEL`; keep OpenAI trio.

## Version Update Plan (0.1.5)
- Update `package.json` version to `0.1.5`.
- Update README badge and any hard-coded version references.
- Ensure `.github/workflows/publish.yml` tags align with `package.json`.
- Verify semantic version is a backward-compatible patch (API unchanged).

## Quality Assurance Plan
- Automated
  - Run `bun run check` (`tsc --noEmit` + `bun test`).
  - Add CI step to run `bun test`; publish test summary.
- Manual
  - `bun run start` and exercise core flows: messaging, commands (`/settings`, `/theme`, `/mode`), mentions, session list.
  - AF bridge: `bun run handoff` to start Python bridge, verify `RequestInfoEvent` overlay behavior; exercise `/run`, `/continue`.
- Backward compatibility
  - Confirm CLI entrypoint unchanged (`package.json:7–9`, `src/index.tsx`).
  - No public API surface changes; commands and env vars stable.

## Deliverables
- Cleaned source with standardized package management and ignores.
- Updated docs (README, ARCHITECTURE, CHANGELOG, new `v0.1.5` release note).
- Version bump to `0.1.5` and aligned CI/publish workflows.
- Verification report summarizing tests passing and manual checks.

## Execution Steps
1) Cleanup: remove npm lockfile, add `bridge.db` to `.gitignore`, adjust CI cache keys, prune/keep `applicationinsights`.
2) Refactors: minor UI composition extractions in `src/index.tsx` (no behavior change).
3) Docs: update README/ARCHITECTURE/CHANGELOG; add `docs/releases/v0.1.5.md`; update `.env.example`.
4) Version bump: update `package.json` and README badge.
5) QA: run typecheck/tests; validate core flows; handoff with bridge; prepare verification report.

## Notes & Constraints
- I will avoid introducing new tooling (ESLint/Prettier) unless requested; formatting will follow existing style.
- If `applicationinsights` is desired, I’ll wire it behind an env flag; otherwise remove.
- I’ll keep Bun as the canonical package manager and align CI accordingly.
