# PRD: rsi run on remote-sandbox test speed

Status: DRAFT

## User Stories

### US-001: Run 4 loops on the remote-sandbox test speed

**Description:** As the operator, I want one real `/rsi` run with a timing metric on the PR path so that the run tests a nonzero margin.

**Acceptance Criteria:**

- [ ] The advisor runs `/rsi` on `task/<N>-remote-sandbox-test-speed` with `--loops 4` and `--slug remote-sandbox-test-speed`, with the scope, metric, holdout, and direction in the Summary.
- [ ] `.agro/tasks/remote-sandbox-test-speed/rsi.tsv` holds 2 baseline rows and 4 loop rows. Each row has 7 columns.
- [ ] `git diff --quiet <start-commit> -- vitest.config.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts .agro/scripts/__tests__/fixtures/remote-sandbox/` exits 0 on the task branch.
- [ ] `git diff --name-only <start-commit> HEAD` lists only the two scope paths and `.agro/tasks/remote-sandbox-test-speed/rsi.tsv`.
- [ ] The ledger holds at least one `margin` value greater than `0`.
- [ ] After loop 4, the advisor runs the holdout on the task branch. The holdout prints the holdout value of the current best.
- [ ] After loop 4, the advisor runs the metric on the task branch. If the ledger holds a `keep` row, the metric is lower than the first baseline metric by more than the baseline noise margin.
- [ ] The run report prints one `REVIEW` line for each `keep` row.

### US-002: Record manual review evidence

**Description:** As a reviewer, I want the run transcript and the `REVIEW` lines in one file so that I can confirm each kept edit.

**Acceptance Criteria:**

- [ ] `.agro/tasks/remote-sandbox-test-speed/evidence/manual-review.md` holds the preflight output, the baseline readings, each loop evaluation, the run report, and the deletion of each worker worktree and branch.
- [ ] The PR `## Manual review` section lists each `REVIEW` line.
- [ ] The operator confirms each `REVIEW` line before the merge. The advisor reverts each kept edit that fails the review, and records the revert in `## Lessons`.
- [ ] `bash .agro/skills/git/scripts/manual-review-check.sh <pr-body-file>` exits 0.

## Summary

PR #1471 shipped `/rsi` version 2. The drill in #1471 used a deterministic metric, so each `margin` value was `0`. The drill also ran only on the local path. This run uses a timing metric on the PR path.

Verified current state:

- `pnpm exec vitest run .agro/scripts/__tests__/remote-sandbox.test.ts` took 5183, 5186, and 5199 ms in three runs, from the vitest JSON reporter. The file has 10 tests.
- Two tests take about 5150 ms each: "runs the driver rows after checks/agro-rows.sh and skips missing hooks" and "calls a row hook only when the adapter defines it".
- `remote-sandbox-adapters.test.ts` passed 32 of 32 tests in the same full-suite run. The two files give 42 expected passes.
- `driver_rows` in `.agro/skills/remote-sandbox/scripts/lib.sh` runs `sleep 5` between the start of the `r09` tmux session and the `tmux has-session` check. On a real VM, the wait lets the client exit before the `R09-disconnect` check.

The run inputs:

| Input | Value |
|---|---|
| Scope | `.agro/scripts/__tests__/remote-sandbox.test.ts .agro/skills/remote-sandbox/scripts/lib.sh` |
| `--metric` | `f=$(mktemp) && pnpm exec vitest run .agro/scripts/__tests__/remote-sandbox.test.ts --reporter=json --outputFile=$f >/dev/null 2>&1 && jq '.testResults[0].endTime - .testResults[0].startTime \| floor' $f` |
| `--holdout` | `f=$(mktemp); pnpm exec vitest run .agro/scripts/__tests__/remote-sandbox.test.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts --reporter=json --outputFile=$f >/dev/null 2>&1; jq -e '42 - .numPassedTests' $f` |
| `--direction` | `min`. The holdout prints the number of missing passes against 42 expected passes. The baseline holdout is `0`. A failed or deleted test raises the holdout. |
| `--loops` | `4` |
| `--slug` | `remote-sandbox-test-speed` |
| Evaluator paths | `vitest.config.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts .agro/scripts/__tests__/fixtures/remote-sandbox/` |

In the table, `\|` is a literal `|` in the command. Each command writes the vitest report to a new `mktemp` file. An empty file makes `jq` fail, so a missing report gives no valid reading.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/skills/rsi/SKILL.md` | section 6 PR path | The run procedure |
| `.agro/skills/remote-sandbox/scripts/lib.sh` | `driver_rows` | Scope: holds the `sleep 5` |
| `.agro/scripts/__tests__/remote-sandbox.test.ts` | the driver-row tests | Scope: the measured tests |
| `.agro/scripts/__tests__/remote-sandbox-adapters.test.ts` | 32 tests | Holdout only |
| `.agro/scripts/__tests__/fixtures/remote-sandbox/` | `bin/tmux` and the adapters | Evaluator: the fake tmux and adapters |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| `driver_rows` in `lib.sh` | Possible modify | A kept edit can change the source of the wait value. A real VM run keeps the 5-second wait. |

## Storage

The ledger is `.agro/tasks/remote-sandbox-test-speed/rsi.tsv`, in the `/rsi` version 2 format with 7 columns. The advisor stages the ledger with `git add -f`.

## Architectural Decisions

- The run uses the PR path of `/rsi` section 6. The loop commits land after the plan commit on the task branch.
- The `--slug` value equals the branch slug, so the ledger and `prd.json` share one task folder.
- The worker brief stays the fixed brief of `/rsi`. The brief does not name the real-VM wait. The `REVIEW` gate checks that intent.
- The fake tmux and the adapters are evaluator paths. A worker cannot lower the metric through a change to the fakes.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/scripts/__tests__/remote-sandbox.test.ts` | all 10 tests, through the metric | The measured scope |
| `.agro/scripts/__tests__/remote-sandbox-adapters.test.ts` | all tests, through the holdout | Adapter behavior stays the same |
| `pnpm test:scripts` in CI | the full suite | No regression outside the scope |

## Design Principles

- Apply the smallest truthful model under the root `AGENTS.md`.
- A kept edit keeps the real-VM behavior of `driver_rows`.
- A person confirms intent. The holdout confirms only the passed-test count.
- Write no explanatory comments in tracked code.

## Out of Scope

- Changes to `.agro/skills/rsi/SKILL.md`.
- Case 4, the comparison of `/rsi` and one agent session at the same budget.
- Other slow test files.
- A `CHANGELOG.md` entry. The run is a test-speed chore. A kept edit keeps the default behavior of `lib.sh`.

## Open Questions

None.

## Acceptance Criteria

- [ ] Each US-001 and US-002 criterion passes on the task branch.
- [ ] `git diff --name-only <base>...HEAD` lists only the two scope paths and files under `.agro/tasks/remote-sandbox-test-speed/`.
- [ ] CI passes on the pushed task branch.

## Lessons

Filled by the advisor before undraft.
