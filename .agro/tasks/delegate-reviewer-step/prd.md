# PRD: Council owns its budget stop

Status: DRAFT

## User Stories

### US-001: Council owns its budget stop

**Description:** As an advisor, I want `/council` to own its budget stop so that `/council` names no missing `/delegate` rule.

**Acceptance Criteria:**

- [ ] `.agro/skills/council/SKILL.md` § 3 states that, at budget exhaustion, the advisor dispatches no further worker and reports `PARTIAL` with the accepted observations and the missing coverage.
- [ ] `.agro/skills/council/references/scenarios.md` § Partial evidence and critic failure names the same council budget stop.
- [ ] `git grep -n "budget-stop" .agro/skills` returns no line.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh .agro/skills/council/SKILL.md .agro/skills/council/references/scenarios.md` reports no finding on a line that this story adds.
- [ ] `pnpm test` exits 0.

## Summary

Before this task, `/council` told the advisor to apply a `/delegate` budget-stop rule at budget exhaustion (`.agro/skills/council/SKILL.md:58`, `.agro/skills/council/references/scenarios.md:33`). `/delegate` has no such rule. The fix states the council budget stop inside `/council`, consistent with the outcome table in `/council` § 5.

The task first planned an optional reviewer step for `/delegate`. A merge council on PR #1491 found that the reviewer step had never run on a real story and left two contract gaps. The operator dropped the reviewer step from this PR. Branch `parked/delegate-reviewer-step` keeps the reviewer change.

## Key Integration Points
| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/skills/council/SKILL.md` | § 3 | Council budget stop |
| `.agro/skills/council/references/scenarios.md` | § Partial evidence and critic failure | Scenario for the council budget stop |

## Interface Integration Points
| Surface | Change Type | Description |
|---|---|---|
| `/council` procedure | Wording fix | `/council` defines the budget stop inside the skill |

## Storage

N/A. The change edits skill procedure text and stores no state.

## Architectural Decisions

- `/council` owns its own budget, as `/council` § 1 step 6 already states the budget.
- `/delegate` stays unchanged.

## Test Plan (TDD)
| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/scripts/__tests__/standard-skills-link.test.ts` | existing cases | Provider mirrors of the changed skill still resolve |
| `.agro/skills/ste/scripts/ste-check.sh` | changed skill files | New prose passes the STE detectors |

The change is procedure prose. The change edits no executable code, so the plan adds no test file.

## Design Principles

- Keep one source of truth for each policy.
- Apply YAGNI: add no procedure without a demonstrated need.

## Out of Scope

- A token budget. The operator reports that spend is not a problem in practice.
- The optional reviewer step for `/delegate`. Branch `parked/delegate-reviewer-step` keeps the change until one real story shows value.
- A manual review evidence story. The plan changes no user interface, server, CLI, or API. The plan changes skill procedure text only.

## Open Questions

None.

## Acceptance Criteria
- [ ] `jq -e 'all(.userStories[]; .passes == true)' .agro/tasks/delegate-reviewer-step/prd.json` exits 0.
- [ ] `pnpm test` exits 0 on the integrated task branch.

## Lessons

1. Claim: the optional reviewer step did not earn a place in the repository yet. Evidence: the merge council found no story that ran with `review: true`. The council also found two gaps: no re-review after a repair, and no rule on the wave cap. Outcome: dropped, because the operator removed the step from this PR. Branch `parked/delegate-reviewer-step` keeps the change.
2. Claim: the CC Safety Net hook blocks a `python3` heredoc and a `bash $VAR` script path. Evidence: rule `analysis.unsupported-heredoc` blocked the workers and the advisor; rule `analysis.dynamic-shell-source` blocked the advisor. Each actor used the remedy that the hook names. Outcome: dropped, because the hook already names the remedy.
3. Claim: `pnpm test` exits 1 in a new task worktree with no `node_modules`. Evidence: the first run printed `vitest: not found`. Outcome: dropped, because `/git` § Worktrees already requires `pnpm install --frozen-lockfile` after `git worktree add`.
