# Manual review: rsi run on remote-sandbox test speed

The advisor ran `/rsi` version 2 on the PR path, on `task/1472-remote-sandbox-test-speed`, with `--loops 4` and `--slug remote-sandbox-test-speed`. One worker made the edit for each loop. The transcript below is the observed output.

Prerequisites: a checkout of the AGRO harness. The run executes in the sandbox, local.

```text
## Preflight (run branch task/1472-remote-sandbox-test-speed, branch slug remote-sandbox-test-speed, run slug remote-sandbox-test-speed; each command runs as bash -o pipefail -c)
Slug: ok
Finished run: ok (no ledger)
Number: metric=5185 holdout=0
Evaluator overlap: none
Task folder overlap: none; Skill overlap: none; Evaluator: named; Loops: 4 ok; Direction: min ok
Clean tree: 0 uncommitted

baseline readings: m1=5186 h1=0 m2=5181 h2=0
dd2f763b task: rsi remote-sandbox-test-speed baseline
0	5186	0	baseline	-
0	5181	0	baseline	5

## Loop 1 dispatch: worker branch rsi/remote-sandbox-test-speed-loop-1 at dd2f763b

## remote-sandbox-test-speed loop 1 evaluation
evaluator check: git diff --quiet <start-commit> -- vitest.config.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts .agro/scripts/__tests__/fixtures/remote-sandbox/ -> exit 0
changed files: .agro/scripts/__tests__/remote-sandbox.test.ts .agro/skills/remote-sandbox/scripts/lib.sh 
worker line: R09 still waits five seconds after the tmux client exits before it checks that the session survives
metric=738 holdout=0 (current best metric=5186 holdout=0, current noise margin=5)
margin readings in run checkout: 840 832
decision=keep margin=8 reason=metric -4448 over best, holdout 0 <= 0; keeps: R09 still waits five seconds after the tmux client exits before it checks that the session survives
5636f644 task: rsi remote-sandbox-test-speed loop 1 keep

 .agro/scripts/__tests__/remote-sandbox.test.ts | 1 +
 .agro/skills/remote-sandbox/scripts/lib.sh     | 3 ++-
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/remote-sandbox-test-speed-loop-1
git-maintenance.sh: ran: git branch -D rsi/remote-sandbox-test-speed-loop-1

## Loop 2 dispatch: worker branch rsi/remote-sandbox-test-speed-loop-2 at 5636f644

## remote-sandbox-test-speed loop 2 evaluation
evaluator check: git diff --quiet <start-commit> -- vitest.config.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts .agro/scripts/__tests__/fixtures/remote-sandbox/ -> exit 0
changed files: .agro/scripts/__tests__/remote-sandbox.test.ts 
worker line: remote-sandbox driver still ignores SIGHUP and destroys the VM exactly once on SIGTERM
metric=275 holdout=0 (current best metric=738 holdout=0, current noise margin=8)
margin readings in run checkout: 273 272
decision=keep margin=1 reason=metric -463 over best, holdout 0 <= 0; keeps: remote-sandbox driver still ignores SIGHUP and destroys the VM exactly once on SIGTERM
487b5d1d task: rsi remote-sandbox-test-speed loop 2 keep

 .agro/scripts/__tests__/remote-sandbox.test.ts | 6 +++---
 .agro/tasks/remote-sandbox-test-speed/rsi.tsv  | 1 +
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/remote-sandbox-test-speed-loop-2
git-maintenance.sh: ran: git branch -D rsi/remote-sandbox-test-speed-loop-2

## Loop 3 dispatch: worker branch rsi/remote-sandbox-test-speed-loop-3 at 487b5d1d

## remote-sandbox-test-speed loop 3 evaluation
evaluator check: git diff --quiet <start-commit> -- vitest.config.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts .agro/scripts/__tests__/fixtures/remote-sandbox/ -> exit 0
changed files: .agro/scripts/__tests__/remote-sandbox.test.ts 
worker line: Driver rows still report R09 and the driver still survives SIGHUP with shorter test waits
metric=221 holdout=0 (current best metric=275 holdout=0, current noise margin=1)
margin readings in run checkout: 209 226
decision=keep margin=17 reason=metric -54 over best, holdout 0 <= 0; keeps: Driver rows still report R09 and the driver still survives SIGHUP with shorter test waits
7d111aac task: rsi remote-sandbox-test-speed loop 3 keep

 .agro/scripts/__tests__/remote-sandbox.test.ts | 4 ++--
 .agro/tasks/remote-sandbox-test-speed/rsi.tsv  | 1 +
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/remote-sandbox-test-speed-loop-3
git-maintenance.sh: ran: git branch -D rsi/remote-sandbox-test-speed-loop-3

## Loop 4 dispatch: worker branch rsi/remote-sandbox-test-speed-loop-4 at 7d111aac

## remote-sandbox-test-speed loop 4 evaluation
evaluator check: git diff --quiet <start-commit> -- vitest.config.ts .agro/scripts/__tests__/remote-sandbox-adapters.test.ts .agro/scripts/__tests__/fixtures/remote-sandbox/ -> exit 0
changed files: .agro/scripts/__tests__/remote-sandbox.test.ts 
worker line: Every remote-sandbox test still passes while discovery and driver-run tests share one concurrent suite
metric=149 holdout=0 (current best metric=221 holdout=0, current noise margin=17)
margin readings in run checkout: 146 149
decision=keep margin=3 reason=metric -72 over best, holdout 0 <= 0; keeps: Every remote-sandbox test still passes while discovery and driver-run tests share one concurrent suite
5bb58d95 task: rsi remote-sandbox-test-speed loop 4 keep

 .agro/scripts/__tests__/remote-sandbox.test.ts | 272 +++++++++++++------------
 .agro/tasks/remote-sandbox-test-speed/rsi.tsv  |   1 +
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/remote-sandbox-test-speed-loop-4
git-maintenance.sh: ran: git branch -D rsi/remote-sandbox-test-speed-loop-4

## Report
RESULT retained gain: metric 5186 -> 149, holdout 0 -> 0, kept 4 of 4 loops
REVIEW loop 1 72299e07: R09 still waits five seconds after the tmux client exits before it checks that the session survives
REVIEW loop 2 1e4ba1ad: remote-sandbox driver still ignores SIGHUP and destroys the VM exactly once on SIGTERM
REVIEW loop 3 2e642841: Driver rows still report R09 and the driver still survives SIGHUP with shorter test waits
REVIEW loop 4 fc9fe865: Every remote-sandbox test still passes while discovery and driver-run tests share one concurrent suite
The holdout cannot confirm intent. A person confirms each REVIEW line before a merge.
PR path rerun on task branch 5bb58d95: metric=143 holdout=0

## Review evidence A: flake count, 40 runs of .agro/scripts/__tests__/remote-sandbox.test.ts at 5bb58d95
failed runs: 0 of 40

## Review evidence B: SIGHUP test with the HUP trap removed
  HUP trap lines left: 0
  HEAD (5bb58d95): passed=0 failed=1
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/rst-sighup-probe
  HUP trap lines left: 0
  dd2f763b (dd2f763b): passed=0 failed=1
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/rst-sighup-probe
```
