# PRD: Facts turn roots

Status: DRAFT

## User Stories

### US-001: Treat a root observation as a turn boundary

**Description:** As an analyst, I want each Claude Code turn root to end a guard follow-up so that the follow-up stays in one turn.

**Acceptance Criteria:**

- [ ] A failing test in `.agro/scripts/__tests__/behavioral-training-facts.test.ts` is committed before the change. The test gives a guard block, then a non-user event with `isRootObservation: true` and a non-null parent in another trace, then a tool call. The test expects the tool call to stay out of the follow-up of the block.
- [ ] `isBoundary` in `facts.mjs` returns true for an event with `isRootObservation === true`.
- [ ] A test proves that an event with `isRootObservation: false` and a non-null parent is still not a boundary.
- [ ] `pnpm run typecheck`, `pnpm test`, and `pnpm run build` exit 0 in the task worktree.

### US-002: Record manual review evidence

**Description:** As a reviewer, I want a command transcript so that I can see the boundary rule on a fixture.

**Acceptance Criteria:**

- [ ] `evidence/manual-review.md` shows the facts test run and the `guardBlocks` follow-up of the new fixture before and after the change. The file holds no transcript content and no secret.

## Summary

Issue #1422. `isBoundary` (`.agro/skills/behavioral-training/scripts/lib/facts.mjs:248`) treats a non-tool, non-user event as a turn root only when `parentObservationId === null`. Each Claude Code turn root carries the parent id of a carrier span that the plugin never exports (#1418). The normalize stage keeps `isRootObservation` on each event after PR #1421. A `user` event still marks a boundary, so the effect is small.

This task depends on PR #1421, which adds `isRootObservation` to normalized events. The branch rebases on `development` after #1421 merges. The new fixture sets the field directly, so the tests do not need #1421.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/skills/behavioral-training/scripts/lib/facts.mjs` | `isBoundary`, `guardFollowUp` | Turn boundary for guard follow-ups |
| `.agro/scripts/__tests__/behavioral-training-facts.test.ts` | facts tests | Regression tests |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| `facts.jsonl` | Behavior | `guardBlocks[].followUp` stops at a turn root |

## Storage

N/A. The change adds no state.

## Architectural Decisions

- Keep the existing `parentObservationId === null` rule for other harnesses. Add the root flag as a second condition.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/scripts/__tests__/behavioral-training-facts.test.ts` | Root with carrier parent is a boundary; non-root with parent is not | US-001 |

## Design Principles

- One condition, one test for each branch.

## Out of Scope

- Changes to the normalize stage.

## Open Questions

None.

## Acceptance Criteria

- [ ] A Claude Code turn root ends a guard follow-up.
- [ ] `pnpm test` exits 0.

## Lessons

None.
