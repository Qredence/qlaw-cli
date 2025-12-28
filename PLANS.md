# ExecPlan: LiteLLM + Coding Agent Upgrade

## Purpose
Modernize qlaw-cli to use LiteLLM-style model identifiers, refresh dependencies, and add foundational coding-agent capabilities inspired by OpenCode (modular providers/tools, file context, and safer tool execution).

## Scope
- Update JS/TS + Python dependency baselines.
- Introduce provider resolution that supports LiteLLM model formats.
- Add minimal coding-agent tool loop (read/list/write/run with approvals) and richer @file context handling.
- Add tool permission policy (allow/ask/deny + external/doom loop checks).
- UX improvements to surface provider/model status and tool activity.
- Update docs/AGENTS with new commands and workflows.

## Plan
1) Dependency audit + upgrades (bun + bridge requirements).
2) Provider refactor: resolve model/provider settings and LiteLLM defaults.
3) Coding-agent tooling: parse tool calls, execute with approval, inject results.
4) Add tool permission policy + safety checks.
5) UX/UI updates: status line, message rendering, tool feedback.
6) Docs + AGENTS updates.

## Progress
- [x] Dependency audit and upgrades (bun + requirements updated).
- [x] Provider refactor (LiteLLM format support).
- [x] Tooling + coding-agent loop (tool blocks + queue + continuation).
- [x] Tool permission policy (allow/ask/deny + external/doom loop).
- [x] UX/UI updates.
- [x] Docs refresh.

## Decisions
- Use LiteLLM-style model names (e.g., `openai/gpt-4o-mini`) as first-class display values.
- Keep OpenAI Responses API compatible path; add minimal tool-call format that works across providers.

## Notes
- Reference OpenCode config patterns (global + project config, tools + permissions) for architecture alignment.
