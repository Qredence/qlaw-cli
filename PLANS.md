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

# ExecPlan: Remove Bridge + Local Agent Definitions

## Purpose
Remove the Python Agent Framework bridge and workflow mode so qlaw-cli only talks directly to model providers. Introduce file-based agent definitions (YAML + .md + .skill) for local agent selection and prompt shaping.

## References
- OpenTUI (TUI framework): https://github.com/sst/opentui
- OpenCode (agent/tooling patterns): https://opencode.ai/docs
- models.dev (model metadata): https://github.com/sst/models.dev

## Scope
- Delete the Python `bridge/` service and all workflow/AF wiring in CLI, scripts, tests, and docs.
- Replace workflow/AF commands with local agent selection commands.
- Add local agent definition loader (YAML metadata + .md instructions + .skill capabilities).
- Make LiteLLM the default provider and auto-populate model selection from env-defined model lists.
- Update UI and settings to surface active agent; keep standard LLM provider flow.
- Refresh documentation to remove bridge references and document agent definition format.

## Non-Goals
- No backend/orchestration service; TUI remains direct-to-provider.
- No external registry or remote agent catalog in this pass.
- No change to tool execution model beyond prompt shaping.

## Plan
1) Remove bridge artifacts: delete `bridge/`, related scripts, examples, and tests; remove AF/workflow settings and commands.
2) Add local agent definitions: create `agents/` with default agents; implement loader and in-memory catalog.
3) Provider defaults: set LiteLLM as the default provider; read model list from `.env` and surface in `/model` selection.
4) Wire agent selection: new `/agents` + `/agent` commands; include agent instructions/skills in system prompt for each request.
5) Update UI/UX: status line/header/placeholder reflect active agent; settings panel removes workflow rows.
6) Docs + tests: update README/AGENTS/docs; add tests for agent loader/mentions; remove AF tests; add tests for model list parsing.

## Success Criteria
- No Python bridge code or AF workflow references remain in runtime paths or docs.
- CLI can list/select local agents and inject agent instructions/skills into prompts.
- Status line shows active agent; settings UI only shows provider/model/config + tools.
- Provider defaults to LiteLLM and `/model` lists models from env-defined list(s).
- Tests pass for updated commands/settings and new agent loader.

## Verification
- `bun run typecheck`
- `bun test`

## Progress
- [ ] Bridge/workflow code removed.
- [ ] Local agent definitions added.
- [x] LiteLLM default provider + env model list parsing.
- [ ] Agent selection + prompt injection implemented.
- [ ] UI/UX updated.
- [ ] Docs/tests updated.

## Decisions
- Agent definitions live in `agents/` and are matched by basename: `{id}.yaml`, `{id}.md`, `{id}.skill`.
- YAML provides metadata (id/name/description); .md provides instructions; .skill provides capabilities list.
- Model list env is `LITELLM_MODELS` (comma-separated or JSON array).

## Notes
- Confirm desired agent schema/fields and whether agent files should be searched only in repo or also in user data dir.

## Open Questions
- Should agent definitions be merged from repo + user data dir (override), or repo-only?
- Should YAML allow model/provider overrides per agent?
