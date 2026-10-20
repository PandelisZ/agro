# Manual review: retro cleanup

The advisor ran each command in `/home/sandbox/harness/.worktrees/task/1488-retro-cleanup` in the sandbox. The transcripts below are the helper output, unedited.

## US-001: the guard tests and the red run

The leftover test fails before US-002 and names the three leftover lines.

```text
US-001 checks at 7398afe2
7398afe2 test: pin name-required messages and reject shell rename leftovers

 .agro/cli/src/__tests__/harness.test.ts            |  1 +
 .agro/cli/src/__tests__/tool.test.ts               |  2 ++
 .../__tests__/shell-rename-leftovers.test.ts       | 32 ++++++++++++++++++++++
 3 files changed, 35 insertions(+)
== red run of the leftover test
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  .agro/scripts/__tests__/shell-rename-leftovers.test.ts > tracked shell files > write each parameter default one time
 FAIL  .agro/scripts/__tests__/shell-rename-leftovers.test.ts > tracked shell files > test each directory without a contradiction
      Tests  2 failed (2)
exit 1
== message tests
 Test Files  2 passed (2)
      Tests  193 passed (193)
exit 0
.agro/cli/src/__tests__/harness.test.ts:165:    expect(!p.ok && p.error).toBe("agro harness install: a harness name is required");
.agro/cli/src/__tests__/tool.test.ts:172:    expect(!r.ok && r.error).toBe("agro tool install: a tool name is required");
.agro/cli/src/__tests__/tool.test.ts:1047:    expect(!r.ok && r.error).toBe("agro tool uninstall: a tool name is required");
pnpm run typecheck: exit 0
+   ".agro/install/banner.sh:21",
+   ".agro/skills/escalate/scripts/escalate.sh:4",
+   ".agro/skills/escalate/scripts/escalate.sh:16",
```

## US-002: the shell fix, the green run, and the full suite

```text
US-002 checks at f009a6a3
f009a6a3 fix: write each escalate and banner shell default one time
-cli_bin="${AGRO_BIN:-${AGRO_BIN:-agro}}"
+cli_bin="${AGRO_BIN:-agro}"
-HARNESS="${AGRO_PROJECT_ROOT:-${AGRO_PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}}"
+HARNESS="${AGRO_PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
-if [ -n "${ESCALATE_STATE_DIR:-}" ]; then
-  STATE_DIR="$ESCALATE_STATE_DIR"
-elif [ ! -d "$HOME/.agro/escalate" ] && [ -d "$HOME/.agro/escalate" ]; then
-  STATE_DIR="$HOME/.agro/escalate"
-else
-  STATE_DIR="$HOME/.agro/escalate"
-fi
+STATE_DIR="${ESCALATE_STATE_DIR:-$HOME/.agro/escalate}"
== green run
 Test Files  4 passed (4)
      Tests  51 passed (51)
exit 0
PASS: escalate decisions, sender identity, and manifest
test-escalate-decision.sh exit 0
PASS: escalate timeout deadlines
test-escalate-timeouts.sh exit 0
shellcheck findings: head 4, parent 4
shellcheck: no new finding
== HARNESS and STATE_DIR resolution
HARNESS=/home/sandbox STATE_DIR=/tmp/fakehome/.agro/escalate
== full suite
 Test Files  108 passed (108)
      Tests  2574 passed | 2 skipped (2576)
exit 0
pnpm run typecheck: exit 0
```

## Failure path

The advisor restored the doubled default of `banner.sh` in a temporary worktree. The leftover test fails, and the advisor removed the temporary worktree after the run.

```text
== failure path at 6bdeffc2
temporary worktree /home/sandbox/harness/.worktrees/tmp/retro-cleanup-review
install exit 0
-cli_bin="${AGRO_BIN:-agro}"
+cli_bin="${AGRO_BIN:-${AGRO_BIN:-agro}}"
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  .agro/scripts/__tests__/shell-rename-leftovers.test.ts > tracked shell files > write each parameter default one time
+   ".agro/install/banner.sh:21",
      Tests  1 failed | 1 passed (2)
exit 1
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/tmp/retro-cleanup-review
temporary worktree removed
```
