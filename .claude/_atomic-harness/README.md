# Atomic CRM agent harness (inactive)

Atomic CRM ships a multi-agent "harness" (orchestrator, planner, developer,
quality-reviewer, merger, documentator) designed for its own devcontainer
(Linux, no display, worktrees under /tmp, slot-leased Supabase instances).

In the TekFusion CRM project it is **disabled on purpose** (see
`docs/10-decisiones.md`, 2026-11-03):

- its rules force English in every committed file and forbid running
  validation commands manually, which conflicts with `CLAUDE.md` and with the
  nightly-session protocol (`docs/14-herramientas-claude-code.md`);
- its hooks assume a Linux devcontainer; this project runs on Windows.

What was moved here (Claude Code does not load anything under this folder):
`agents/`, `CLAUDE-atomic.md`, harness-only `rules/`, `commands/` and `skills/`.
The harness hooks stay in `.claude/hooks/` (their shared `lib/` is used by the
hooks we kept) but are not wired in `.claude/settings.json`.

To reactivate: move the folders back under `.claude/`, restore the hook wiring
from upstream `settings.json`, and record the decision in `docs/10-decisiones.md`.
Upstream base: marmelab/atomic-crm @ 251d3cccf4dc35c9f53036057bdf558dc2e108ba.
