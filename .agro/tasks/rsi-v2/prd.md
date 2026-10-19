# PRD: rsi v2

Status: DRAFT

## User Stories

### US-001: Add a run slug input

**Description:** As an operator, I want to name each `/rsi` run with `--slug <run-slug>`. Two runs can then share one task branch without a shared ledger.

**Acceptance Criteria:**

- [ ] The `/rsi` inputs table in `.agro/skills/rsi/SKILL.md` lists an optional `--slug <run-slug>` input.
- [ ] Without `--slug`, the skill takes the run slug from the run branch name, as version 1 does.
- [ ] Preflight stops with `BLOCKED` when the run slug breaks the slug rules in `.agro/skills/prd/SKILL.md` section 2.
- [ ] Preflight stops with `BLOCKED` when `.agro/tasks/<run-slug>/rsi.tsv` holds a finished run with `<N>` loop rows.
- [ ] The ledger path, the worker branch names, and the commit messages use `<run-slug>`.
- [ ] The PR path section states that one task branch can hold several runs, one run at a time, each with its own `--slug`.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh .agro/skills/rsi/SKILL.md` exits 0.

### US-002: Measure the noise margin again after each keep

**Description:** As an operator, I want the noise margin measured again at each new best. A margin from a 13.7-second baseline then never judges a 0.4-second metric.

**Acceptance Criteria:**

- [ ] The ledger table lists a seventh column `margin`.
- [ ] The second baseline row holds the baseline noise margin in the `margin` column.
- [ ] After the cherry-pick of a `keep` edit, the advisor runs the metric two times in the run checkout. The `margin` column of the `keep` row holds the absolute difference of the two readings.
- [ ] A `reject` row holds `-` in the `margin` column.
- [ ] The current noise margin is the `margin` of the last `keep` row. With no `keep` row, the current noise margin is the `margin` of the second baseline row.
- [ ] Resume stops with `BLOCKED` when the ledger rows hold fewer than seven columns.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh .agro/skills/rsi/SKILL.md` exits 0.

### US-003: Print a reviewer checklist

**Description:** As a reviewer, I want one line for each kept edit after the result line. Then I can check intent that no holdout measures.

**Acceptance Criteria:**

- [ ] The worker brief asks the worker for one line that names the behavior that the edit keeps.
- [ ] The `reason` of each `keep` row holds the gain, then `; keeps: <worker line>`.
- [ ] After the result line, the report prints `REVIEW loop <k> <commit>: <worker line>` for each `keep` row, in loop order.
- [ ] The report states that the holdout cannot confirm intent, and that a person confirms each `REVIEW` line before a merge.
- [ ] The PR path section puts the `REVIEW` lines in the PR `## Manual review` section.
- [ ] `CHANGELOG.md` holds one `### Changed` entry under `## [Unreleased]` for the three `/rsi` changes.
- [ ] `wc -l < .agro/skills/rsi/SKILL.md` prints a number less than 500, and `bash .agro/skills/ste/scripts/ste-check.sh .agro/skills/rsi/SKILL.md` exits 0.

### US-004: Record manual review evidence

**Description:** As a reviewer, I want one real run of each change. Then I can see the slug, the margin column, and the checklist work.

**Acceptance Criteria:**

- [ ] Two fixture runs share one local branch `rsi/v2-drill` with `--slug v2-drill-a` and `--slug v2-drill-b`, `--loops 2` each. The operator approves the fixture, the metric, and the holdout before the runs.
- [ ] Each run writes its own ledger, `.agro/tasks/v2-drill-a/rsi.tsv` and `.agro/tasks/v2-drill-b/rsi.tsv`.
- [ ] Each `keep` row holds a number in the `margin` column, and each `reject` row holds `-`.
- [ ] Each run report prints one `REVIEW` line for each `keep` row.
- [ ] A third invocation with `--slug v2-drill-a` stops with `BLOCKED`, because that run is finished.
- [ ] `.agro/tasks/rsi-v2/evidence/manual-review.md` holds the transcript. The transcript shows the deletion of each temporary worktree and branch.

## Summary

PR #1469 ran `/rsi` on three cases. Its Lessons name three gaps in `.agro/skills/rsi/SKILL.md`:

1. Section 1 takes the slug from the run branch name. Two runs on one task branch would share one `rsi.tsv`.
2. Section 3 sets the noise margin once from two baseline readings. US-002 of #1469 kept a 0.12-second gain at about 0.7 seconds with a 0.07-second margin from a 13.7-second baseline. A worker observed a spread of about 0.3 seconds at that level.
3. Section 4.5 prints only a result line. The holdouts of #1469 missed a shared fixture run and a minifier-only alias. Operator review reverted both edits in `0c3431c2`.

The skill has 318 lines. The three changes stay in `SKILL.md` and add no script.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/skills/rsi/SKILL.md` | section 1 inputs, step 4 slug | US-001 slug input |
| `.agro/skills/rsi/SKILL.md` | section 2 Preflight | US-001 slug checks |
| `.agro/skills/rsi/SKILL.md` | section 3 ledger table, "Noise margin and current best" | US-002 margin column |
| `.agro/skills/rsi/SKILL.md` | section 4.1 worker brief, 4.3 keep rule, 4.4 record | US-002 and US-003 |
| `.agro/skills/rsi/SKILL.md` | section 4.5 report, section 5 Resume, section 6 PR path | US-001, US-002, US-003 |
| `.agro/skills/prd/SKILL.md` | section 2 slug rules | US-001 reuses the rules by reference |
| `CHANGELOG.md` | `## [Unreleased]` | US-003 entry |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| `/rsi --slug <run-slug>` | New | Optional run slug. |
| `.agro/tasks/<run-slug>/rsi.tsv` | Modify | Seventh column `margin`. |
| `/rsi` result report | Modify | `REVIEW` lines after the result line. |

## Storage

The ledger stays at `.agro/tasks/<run-slug>/rsi.tsv`. Each row gains a seventh column `margin`. The ledger stays append-only. A version 1 ledger has six columns, and resume of a version 1 ledger stops with `BLOCKED`.

## Architectural Decisions

- The run slug names the ledger, the worker branches, and the commit messages. The run branch no longer names the ledger when `--slug` is present.
- The advisor measures the noise margin again only after a `keep`, in the run checkout, before the row commit. A `reject` leaves the margin unchanged.
- The `keep` row stores the worker line in `reason`. The ledger stays the only run state, and the `REVIEW` lines come from the ledger.
- The changes edit `SKILL.md` only. No script and no new file.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| N/A | No automated test | `SKILL.md` holds procedure prose and no code. `/rsi` version 1 used the same pattern. |
| `.agro/skills/ste/scripts/ste-check.sh` | `.agro/skills/rsi/SKILL.md` | Prose rules. |
| `.agro/tasks/rsi-v2/evidence/manual-review.md` | two runs on one branch, a finished-run refusal | US-001, US-002, US-003 |

## Design Principles

- Apply the smallest truthful model under the root `AGENTS.md`.
- Keep the ledger as the only run state.
- Keep human review as the gate for intent.
- Write no explanatory comments in tracked code.

## Out of Scope

- A confidence interval or a `--reps` input for the noise margin.
- Parallel runs on one branch.
- A migration of version 1 ledgers.
- Improvement of the improver.
- Case 4, the comparison of `/rsi` and one agent session at the same budget.

## Open Questions

1. Resolved: two readings measure the margin in version 2. A `--reps` input waits for a run where two readings give a wrong decision.
2. Resolved: resume of a version 1 ledger stops with `BLOCKED`. No version 1 run is in progress.

## Acceptance Criteria

- [ ] Each US-001, US-002, US-003, and US-004 criterion passes on the task branch.
- [ ] `git diff --name-only <base>...HEAD` lists only `.agro/skills/rsi/SKILL.md`, `CHANGELOG.md`, and files under `.agro/tasks/`.

## Lessons

Filled by the advisor before undraft.
