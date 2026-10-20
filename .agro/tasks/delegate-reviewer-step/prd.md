# PRD: Optional reviewer step for /delegate

Status: DRAFT

## User Stories

### US-001: Optional reviewer step before acceptance

**Description:** As an advisor, I want an optional independent reviewer for a story so that a second context checks each change before I accept it.

**Acceptance Criteria:**

- [ ] `.agro/skills/prd/references/tracker.md` documents an optional story field `review` boolean with the default `false`. The text states that the field does not change `schemaVersion`.
- [ ] `.agro/skills/delegate/SKILL.md` § Acceptance states that, if a story has `review: true`, the advisor dispatches one read-only reviewer worker after the implementer commit and before the advisor brings the commit onto the task branch.
- [ ] The reviewer brief in `.agro/skills/delegate/SKILL.md` states that the reviewer starts in a fresh context, reads the story criteria and the worker commit, edits no file, and labels each finding `blocking` or `non-blocking`.
- [ ] § Acceptance states that a `blocking` finding returns the story to the same implementer worker as a bounded repair, and that the advisor allows at most 2 review rounds for each story.
- [ ] § Acceptance states that the reviewer never accepts, and that the advisor still runs each verification step.
- [ ] § Model policy states that the reviewer uses a model other than the implementer model when one is available. If no other model is available, the reviewer uses the implementer model in a fresh context, and the advisor records that fact in `notes`.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh .agro/skills/delegate/SKILL.md` reports no finding on a line that this story adds.
- [ ] `pnpm test` exits 0.

### US-002: Council owns its budget stop

**Description:** As an advisor, I want `/council` to own its budget stop so that `/council` names no missing `/delegate` rule.

**Acceptance Criteria:**

- [ ] `.agro/skills/council/SKILL.md` § 3 states that, at budget exhaustion, the advisor dispatches no further worker and reports `PARTIAL` with the accepted observations and the missing coverage.
- [ ] `.agro/skills/council/references/scenarios.md` § Partial evidence and critic failure names the same council budget stop.
- [ ] `git grep -n "budget-stop" .agro/skills` returns no line.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh .agro/skills/council/SKILL.md .agro/skills/council/references/scenarios.md` reports no finding on a line that this story adds.
- [ ] `pnpm test` exits 0.

## Summary

The council brief in `.agro/tasks/council-swarm/` and the architecture brief for the Herdr worker launch kept native workers and `prd.json` as the only run state. The operator selected one addition: an optional reviewer step in `/delegate`. The task also removes a dangling reference from `/council` to a `/delegate` budget-stop rule.

Verified current state:

- `/delegate` § Acceptance has the advisor inspect, integrate, and verify each worker commit. No independent review step exists (`.agro/skills/delegate/SKILL.md`, § Acceptance).
- The tracker permits optional story fields without a `schemaVersion` change (`.agro/skills/prd/references/tracker.md`, § Output schema).
- `/council` tells the advisor to apply a `/delegate` budget-stop rule at budget exhaustion (`.agro/skills/council/SKILL.md:58`, `.agro/skills/council/references/scenarios.md:33`). `/delegate` has no such rule.
- Prime Intellect used an adversarial reviewer on a different model in a separate context for each task of its Rust rewrite (`https://www.primeintellect.ai/blog/prime-agent-rust`).

## Key Integration Points
| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/skills/delegate/SKILL.md` | § Worker brief, § Acceptance, § Model policy | Canonical dispatch, review, and acceptance procedure |
| `.agro/skills/prd/references/tracker.md` | § Output schema | `prd.json` field definition for `review` |
| `.agro/skills/council/SKILL.md` | § 3, line 58 | Council budget stop |
| `.agro/skills/council/references/scenarios.md` | § Partial evidence and critic failure | Scenario for the council budget stop |

## Interface Integration Points
| Surface | Change Type | Description |
|---|---|---|
| `prd.json` | Additive optional field | `review` boolean on each story, default `false` |

## Storage

The run state stays in `.agro/tasks/<slug>/prd.json`. Git tracks the file. The advisor records each review round and its findings in the story `notes`. No new file, service, or ledger exists.

## Architectural Decisions

- `prd.json` stays the single source of truth for run state.
- The reviewer is a worker. The advisor alone accepts, as ADR #989 requires.
- The reviewer is read-only and owns no write paths.
- The review step is off by default.

## Test Plan (TDD)
| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/scripts/__tests__/standard-skills-link.test.ts` | existing cases | Provider mirrors of the changed skills still resolve |
| `.agro/scripts/__tests__/skill-shell-portability.test.ts` | existing cases | Shell examples in the changed skills stay portable |
| `.agro/skills/ste/scripts/ste-check.sh` | changed skill files | New prose passes the STE detectors |

The change is procedure prose. The change edits no executable code, so the plan adds no test file.

## Design Principles

- Keep one source of truth for run state.
- Add an optional field. Do not change `schemaVersion`.
- Keep the reviewer optional and off by default.
- Write no explanatory comments in tracked code.

## Out of Scope

- A token budget. The operator reports that spend is not a problem in practice.
- A Herdr worker transport. The architecture brief rejected that option under ADR #989.
- A message bus, IRC, peer messaging, or nested workers.
- A manual review evidence story. The plan changes no user interface, server, CLI, or API. The plan changes skill procedure text only.

## Open Questions

None. The operator accepted the same-model reviewer fallback and the cap of 2 review rounds for each story.

## Acceptance Criteria
- [ ] `jq -e 'all(.userStories[]; .passes == true)' .agro/tasks/delegate-reviewer-step/prd.json` exits 0.
- [ ] `pnpm test` exits 0 on the integrated task branch.

## Lessons

1. Claim: the CC Safety Net hook blocks a `python3` heredoc and a `bash $VAR` script path. Evidence: rule `analysis.unsupported-heredoc` blocked both workers and the advisor; rule `analysis.dynamic-shell-source` blocked the advisor. Each actor used the remedy that the hook names: the Edit tool or a literal path. Outcome: dropped, because the hook already names the remedy.
2. Claim: `pnpm test` exits 1 in a new task worktree with no `node_modules`. Evidence: the first run printed `vitest: not found`. Outcome: dropped, because `/git` § Worktrees already requires `pnpm install --frozen-lockfile` after `git worktree add`.
