# PRD: Trace capture fidelity for behavioral analysis

Status: DRAFT

## User Stories

### US-001: Write the approved capture limit to each harness

**Description:** As an operator, I want `agro langfuse apply` to set the plugin capture limit to 100000 characters so that the plugins truncate fewer fields.

**Acceptance Criteria:**

- [ ] A failing test is committed before the change, then passes: the Claude Code writer puts `CC_LANGFUSE_MAX_CHARS: "100000"` in the `env` block of `~/.claude/settings.json` and keeps every other key.
- [ ] A failing test is committed before the change, then passes: the fragment renders `PI_LANGFUSE_MAX_CHARS=100000` after the four existing keys.
- [ ] One exported constant holds the value `100000`. Both writers read that constant.
- [ ] `pnpm run typecheck`, `pnpm test`, and `pnpm run build` exit 0 in the task worktree.

### US-002: Stop counting plugin root parents as capture gaps

**Description:** As an analyst, I want the adapter to skip the parent of a root observation so that the capture report counts only real gaps.

**Acceptance Criteria:**

- [ ] A failing test is committed before the change, then passes: a fixture row with `isRootObservation: true` and an absent parent adds no `parent` entry to `capture.missing`.
- [ ] A test proves that a non-root row with an absent parent still adds a `parent` entry.
- [ ] The normalized event keeps `isRootObservation`, and `references/run-files.md` names the field.
- [ ] `pnpm test` exits 0 in the task worktree.

### US-003: Document the limit, the trade-off, and the root cause

**Description:** As an operator, I want `docs/integrations/langfuse.md` to state the capture limit and its cost so that I can change the limit with full knowledge.

**Acceptance Criteria:**

- [ ] `docs/integrations/langfuse.md` states the 100000 limit for Claude Code and Pi, and the privacy and cost trade-off.
- [ ] The Codex section no longer names `LANGFUSE_CODEX_MAX_CHARS`, because plugin 0.4.2 has no such setting.
- [ ] `references/langfuse-adapter.md` explains the root-parent rule and cites the Claude Code plugin behavior.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh` exits 0 on each changed Markdown file.

### US-004: Record manual review evidence

**Description:** As a reviewer, I want a command transcript so that I can see the new limit and the new gap count on real output.

**Acceptance Criteria:**

- [ ] `evidence/manual-review.md` shows `agro langfuse apply` output with a temporary `HOME`, and the rendered `CC_LANGFUSE_MAX_CHARS` and `PI_LANGFUSE_MAX_CHARS` values.
- [ ] `evidence/manual-review.md` shows aggregate missing-parent counts before and after the US-002 rule on one fixture. It holds no transcript content and no secret.
- [ ] The temporary `HOME` is deleted after the run.

## Summary

Issue #1418 reports two capture gaps from the #1413 analysis. First, 46 of 100 sampled sessions carry a truncation marker at the 20000-character plugin limit. Second, 78 of 100 sessions reference parent observations that Langfuse never stored.

Verified facts:

- The Claude Code plugin (`langfuse-observability` 1.2.0) reads `CC_LANGFUSE_MAX_CHARS`, default 20000 (`hooks/langfuse_hook.py:45`).
- The Pi plugin (0.1.2) reads `PI_LANGFUSE_MAX_CHARS` from the environment only, default 20000 (`src/index.ts:29`).
- The Codex plugin (`tracing` 0.4.2) has no character limit setting. `docs/integrations/langfuse.md:218` names `LANGFUSE_CODEX_MAX_CHARS`, which the plugin does not read.
- The operator approved 100000 as the limit.
- The Claude Code plugin opens each "Conversational Turn" root span under a non-recording carrier span with a random id. The plugin never exports the carrier (`hooks/langfuse_hook.py:3076-3102`, `3162`). Langfuse marks the root with `isRootObservation: true` and keeps the dangling `parentObservationId`.
- A metadata-only read over 2026-10-08 to 2026-10-11 returned 4025 observations in 203 traces. All 193 root observations had a parent id that was not stored. These 193 rows are 193 of the 313 dangling references in the window.
- A second metadata-only probe, approved by the operator, classified the 120 non-root references. 11 point at a root span that started before the window. 109 point at 9 turn roots that Langfuse never stored. The plugin saves the root span id before the flush, and caps the flush at 5 seconds (`hooks/langfuse_hook.py:3478-3502`). When the root flush drops, later firings of the turn attach children to the lost root.

Approach: write the limit through the existing tracing writers, skip root parents in the adapter, and document both. No upstream issue is necessary for the root parent, because the plugin and the Langfuse API both document it.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/cli/src/lib/tracing/harness-writers.ts` | `claudeCodeTracingWriter` | Writes the `env` block of `~/.claude/settings.json` |
| `.agro/cli/src/lib/tracing/providers/langfuse.ts` | `LANGFUSE_FRAGMENT_KEYS`, `renderLangfuseFragment` | Renders the fragment that the shell sources for Pi |
| `.agro/cli/src/commands/langfuse.ts` | fragment render and status | Compares files with a fresh render |
| `.agro/skills/behavioral-training/scripts/lib/normalize.mjs` | `shape`, `captureOf`, `parentEntry` | Records parent gaps |
| `.agro/skills/behavioral-training/references/run-files.md` | normalized event schema | Names the event fields |
| `docs/integrations/langfuse.md` | Harnesses section | Operator documentation |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| `~/.claude/settings.json` | Added key | `env.CC_LANGFUSE_MAX_CHARS = "100000"` |
| `~/.config/agro/langfuse.env` | Added line | `PI_LANGFUSE_MAX_CHARS=100000` |
| `normalized-sessions.jsonl` | Added field | `events[].isRootObservation` |

## Storage

The fragment stays at mode 0600. No new storage.

## Architectural Decisions

- One exported constant in the tracing module owns the limit. Do not add an `agro.json` setting (YAGNI).
- Claude Code gets the limit from its settings file, as it gets the base URL today. Pi gets the limit from the fragment, because Pi reads only the environment.
- The adapter treats `isRootObservation: true` as proof that the parent is external.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/cli/src/lib/tracing/__tests__/harness-writers.test.ts` | Claude writer sets the limit and keeps other keys | US-001 |
| `.agro/cli/src/lib/tracing/__tests__/langfuse-fragment.test.ts` | Fragment renders five lines, limit last | US-001 |
| `.agro/scripts/__tests__/behavioral-training-normalize.test.ts` | Root parent skipped; non-root parent kept | US-002 |
| `.agro/scripts/__tests__/behavioral-training-docs.test.ts` | Existing documentation checks pass | US-003 |

## Design Principles

- Apply the smallest change that gives the approved limit.
- Keep the fragment free of new secrets.
- Count only real capture gaps.

## Out of Scope

- Changes to `langfuse.enabled`.
- A Codex limit, because plugin 0.4.2 has no such setting.
- An upstream plugin issue for root parents.
- Recommendations 2 to 5 of the #1413 follow-up.

## Open Questions

1. The plugin code calls the dropped-flush loss of a turn root an accepted limitation. The operator decides whether to file an upstream report.
2. The re-inventory runs after new traces accumulate. The date is not known.

## Acceptance Criteria

- [ ] The operator approved the 100000 limit before it was applied.
- [ ] `pnpm run typecheck`, `pnpm test`, and `pnpm run build` exit 0 after `pnpm install --frozen-lockfile`.
- [ ] `docs/integrations/langfuse.md` states the limit and the trade-off, and ste-check exits 0.
- [ ] The root-parent cause is documented with metadata-only evidence.
- [ ] A re-inventory compares the truncation rate and the missing-parent rate with 46/100 and 78/100.

## Lessons

1. Claim: the root parent of each Claude Code turn is a carrier span that the plugin never exports. Evidence: all 193 root observations in a 3-day metadata read carry such a parent (`hooks/langfuse_hook.py:3076-3102`). Outcome: fixed in this PR. The normalize stage skips the parent of a root observation.
2. Claim: a dropped SDK flush loses a turn root, and later firings attach children to it. Evidence: 109 references in 9 traces without a root. The plugin saves the progress before a flush that it caps at 5 seconds (`hooks/langfuse_hook.py:3478-3502`). Outcome: upstream issue langfuse/claude-observability-plugin#103.
3. Claim: the docs named `LANGFUSE_CODEX_MAX_CHARS`, which Codex plugin 0.4.2 does not read. Evidence: the plugin bundle has no character limit setting. Outcome: fixed in this PR.
4. Claim: `isBoundary` in `facts.mjs:251` misses Claude Code turn roots, because each root carries a carrier parent. Evidence: the US-002 worker report. A user message still marks a boundary, so the effect is small. Outcome: issue #1422.
5. Claim: the re-inventory needs new traces at the 100000 limit. Evidence: the limit takes effect only after `agro langfuse apply` and new sessions. Outcome: proposed follow-up on #1418 after one week of traces.
