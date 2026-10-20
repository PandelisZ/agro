# PRD: retro cleanup of a test gap and shell rename leftovers

Status: DRAFT

## User Stories

### US-001: Add the guard tests

**Description:** As the operator, I want tests that pin the name-required messages and that reject doubled shell defaults. A later edit then cannot change those messages or bring back a rename leftover unseen.

**Acceptance Criteria:**

- [ ] `.agro/cli/src/__tests__/harness.test.ts` asserts that `parseHarnessArgs(["install"])` returns the error `agro harness install: a harness name is required`.
- [ ] `.agro/cli/src/__tests__/tool.test.ts` asserts that `parseToolArgs(["install"])` returns the error `agro tool install: a tool name is required`, and that `parseToolArgs(["uninstall"])` returns the error `agro tool uninstall: a tool name is required`.
- [ ] `.agro/scripts/__tests__/shell-rename-leftovers.test.ts` scans each tracked `.sh` file. The test fails for a parameter expansion of the form `${NAME:-${NAME:-...}}` with the same name twice. The test also fails for a condition of the form `[ ! -d "X" ] && [ -d "X" ]` with the same path twice.
- [ ] Before US-002, `pnpm exec vitest run .agro/scripts/__tests__/shell-rename-leftovers.test.ts` exits 1 and names `.agro/skills/escalate/scripts/escalate.sh` and `.agro/install/banner.sh`.
- [ ] `pnpm exec vitest run .agro/cli/src/__tests__/harness.test.ts .agro/cli/src/__tests__/tool.test.ts` exits 0.

### US-002: Remove the shell rename leftovers

**Description:** As the operator, I want each shell default written one time. The scripts then state the behavior that they run.

**Acceptance Criteria:**

- [ ] Line 4 of `.agro/skills/escalate/scripts/escalate.sh` reads `AGRO_PROJECT_ROOT` one time and keeps the fallback to the path four levels above the script.
- [ ] `escalate.sh` sets `STATE_DIR` to `ESCALATE_STATE_DIR` when that variable is not empty, and to `$HOME/.agro/escalate` otherwise. The `elif` branch is gone.
- [ ] `.agro/install/banner.sh` sets `cli_bin` from `AGRO_BIN` with the default `agro`, and reads `AGRO_BIN` one time.
- [ ] `pnpm exec vitest run .agro/scripts/__tests__/shell-rename-leftovers.test.ts .agro/scripts/__tests__/escalate-env.test.ts .agro/scripts/__tests__/boot-banner.test.ts .agro/scripts/__tests__/entrypoint.test.ts` exits 0.
- [ ] `bash .agro/skills/escalate/scripts/test-escalate-decision.sh` and `bash .agro/skills/escalate/scripts/test-escalate-timeouts.sh` exit 0.
- [ ] `shellcheck .agro/skills/escalate/scripts/escalate.sh .agro/install/banner.sh` reports no new finding.

### US-003: Record manual review evidence

**Description:** As a reviewer, I want the red and green test runs and the script diffs in one file.

**Acceptance Criteria:**

- [ ] `.agro/tasks/retro-cleanup/evidence/manual-review.md` holds the red run of US-001, the green run after US-002, and the full test suite result.
- [ ] The PR `## Manual review` section gives the commands and one failure path with its observed exit status.
- [ ] `bash .agro/skills/git/scripts/manual-review-check.sh <pr-body-file>` exits 0.

## Summary

The retro of the three `/rsi` runs (PR #1483, PR #1485, and PR #1487) found two items with value.

Verified current state at `3ad215d6`:

- `.agro/cli/src/cli.ts` line 1043 builds the message `${bin} ${noun} ${sub}: a ${noun} name is required`.
- `harness.test.ts` line 164 matches only `/name is required/`. `tool.test.ts` lines 168 to 172 and 1042 to 1046 check `showHelp` and no message. A change of the noun in the message passed 193 of 193 tests in PR #1483.
- `escalate.sh` line 4 reads `${AGRO_PROJECT_ROOT:-${AGRO_PROJECT_ROOT:-...}}`. Lines 16 and 17 hold `elif [ ! -d "$HOME/.agro/escalate" ] && [ -d "$HOME/.agro/escalate" ]`, a condition that is never true.
- `.agro/install/banner.sh` line 21 reads `cli_bin="${AGRO_BIN:-${AGRO_BIN:-agro}}"`.
- `git grep` finds no other tracked shell file with either pattern.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/cli/src/cli.ts` | `parseInstallerArgs` | Builds the name-required message |
| `.agro/cli/src/__tests__/harness.test.ts` | "requires a name for install" | Pins the harness message |
| `.agro/cli/src/__tests__/tool.test.ts` | "requires a name for install", "requires a name for uninstall" | Pin the `agro tool` messages |
| `.agro/skills/escalate/scripts/escalate.sh` | `HARNESS`, `STATE_DIR` | Rename leftovers |
| `.agro/install/banner.sh` | `cli_bin` | Rename leftover |
| `.agro/scripts/__tests__/shell-rename-leftovers.test.ts` | new test | Rejects the leftover patterns |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| `agro harness` and `agro tool` messages | None | The tests pin the current text. |
| `escalate.sh` and `banner.sh` | Modify | Each script writes each default one time. The resolved values do not change. |

## Storage

N/A. The change adds no state.

## Architectural Decisions

- The leftover test reads the tracked shell files as text. A pattern test keeps the rule in one place and needs no shell run.
- The test compares the two names and the two paths, so a different fallback name stays allowed.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/scripts/__tests__/shell-rename-leftovers.test.ts` | doubled default, repeated directory test | No rename leftover in a tracked shell file |
| `.agro/cli/src/__tests__/harness.test.ts` | install with no name | The exact harness message |
| `.agro/cli/src/__tests__/tool.test.ts` | install and uninstall with no name | The exact tool messages |
| `.agro/scripts/__tests__/escalate-env.test.ts`, `test-escalate-*.sh`, `boot-banner.test.ts` | existing cases | The scripts keep their behavior |

## Design Principles

- Apply the smallest truthful model under the root `AGENTS.md`.
- Write no explanatory comments in tracked code.

## Out of Scope

- The broken link in `.agro/skills/langfuse/references/instrumentation.md`. `behavioral-training-docs.test.ts` pins a checksum of that directory.
- The broken link in a released section of `CHANGELOG.md`.
- More `/rsi` runs.
- A `CHANGELOG.md` entry. The change is a chore with no user-visible effect.

## Open Questions

None.

## Acceptance Criteria

- [ ] Each US-001, US-002, and US-003 criterion passes on the task branch.
- [ ] The full test suite passes, and `pnpm run typecheck` exits 0.
- [ ] CI passes on the pushed task branch.

## Lessons

- A third rename leftover was in `.agro/install/banner.sh`. Evidence: `git grep` for the doubled default found `cli_bin="${AGRO_BIN:-${AGRO_BIN:-agro}}"`. Outcome: fixed in this PR. The guard test now covers each tracked shell file.
- The secret-exposure guard denied a `jq` command because the notes text held the word `env`. The command read no environment. Outcome: dropped, because the advisor wrote the notes to a file and reworded them, and the guard did its job.
- An `eval` probe of `escalate.sh` printed a wrong `HARNESS` value, because `BASH_SOURCE` is empty under `bash -c`. Outcome: dropped, because the advisor removed the probe from the evidence and the escalate tests cover the resolution.
