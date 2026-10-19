# Manual review: rsi v2 drill

The advisor ran `/rsi` two times on one local branch `rsi/v2-drill`, with `--slug v2-drill-a` and `--slug v2-drill-b`. Each run used `--loops 2`. The run used `.agro/skills/rsi/SKILL.md` at `6b34746d`. The operator approved the fixture, the metric, and the holdout before the runs.

Prerequisites: a checkout of the AGRO harness. The drill runs in the sandbox, local. The advisor cut `rsi/v2-drill` from `skill/1470-rsi-v2` at `40b02135` and committed two fixture files at `dcb93c93`. One worker made the edit for each loop. The transcript below is the observed output.

Expected results:

1. Each run writes its own ledger: `.agro/tasks/v2-drill-a/rsi.tsv` and `.agro/tasks/v2-drill-b/rsi.tsv`.
2. Each ledger row has seven columns. Each `keep` row holds a number in `margin`. Each `reject` row holds `-`.
3. Each run report prints one `REVIEW` line for each `keep` row.
4. A third invocation with `--slug v2-drill-a` stops with `BLOCKED`.
5. The drill deletes each temporary worktree and branch.

The first evaluation of loop 1 of run A was not valid. The advisor helper ran under zsh, and zsh does not split `$CF`. The helper read an in-scope edit as outside the scope. The advisor reset the run branch to `ddc7d094` and measured the same worker commit `fb7d28d9` again under bash. The transcript keeps that record.

```text
## Preflight v2-drill-a (run branch rsi/v2-drill, branch slug v2-drill, run slug v2-drill-a)
Slug: ok
Finished run: ok (no ledger)
Number: metric=10 holdout=10
Evaluator overlap: none; Task folder overlap: none; Skill overlap: none; Loops: 2 ok; Direction: min ok; Clean tree: 0 uncommitted
baseline readings: m1=10 h1=10 m2=10 h2=10
ddc7d094 task: rsi v2-drill-a baseline
0	dcb93c9327847d5a9d15e41a5c7ce78ea051408d	10	10	baseline	-
0	dcb93c9327847d5a9d15e41a5c7ce78ea051408d	10	10	baseline	0
## v2-drill-a loop 1 dispatch: worker branch rsi/v2-drill-a-loop-1 at ddc7d094

## v2-drill-a loop 1 evaluation
evaluator check: git diff --quiet <start-commit> -- .agro/skills/ste/scripts/ste-check.sh -> exit 0
changed files: fixture/ste-a.md 
worker line: Keep the instruction to restart the service
decision=reject margin=- reason=edit outside scope: fixture/ste-a.md 
27a950c9 task: rsi v2-drill-a loop 1 reject

 .agro/tasks/v2-drill-a/rsi.tsv | 1 +
 1 file changed, 1 insertion(+)
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/v2-drill-a-loop-1
git-maintenance.sh: ran: git branch -D rsi/v2-drill-a-loop-1

## v2-drill-a loop 2 dispatch: worker branch rsi/v2-drill-a-loop-2 at 27a950c9
ADVISOR DEFECT: the helper ran under zsh, which does not split $CF, so the in-scope edit read as outside scope. The advisor reset the run branch to ddc7d094 and re-measured worker commit fb7d28d9 under bash.

## v2-drill-a loop 1 evaluation
evaluator check: git diff --quiet <start-commit> -- .agro/skills/ste/scripts/ste-check.sh -> exit 0
changed files: fixture/ste-a.md 
worker line: Keep the instruction to restart the service
metric=7 holdout=7 (current best metric=10 holdout=10, current noise margin=0)
margin readings in run checkout: 7 7
decision=keep margin=0 reason=metric -3 over best, holdout 7 <= 10; keeps: Keep the instruction to restart the service
e206b948 task: rsi v2-drill-a loop 1 keep

 .agro/tasks/v2-drill-a/rsi.tsv | 1 +
 fixture/ste-a.md               | 2 +-
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/v2-drill-a-loop-1
git-maintenance.sh: ran: git branch -D rsi/v2-drill-a-loop-1
1	7	7	keep	metric -3 over best, holdout 7 <= 10; keeps: Keep the instruction to restart the service	0

## v2-drill-a loop 2 dispatch: worker branch rsi/v2-drill-a-loop-2 at e206b948

## v2-drill-a loop 2 evaluation
evaluator check: git diff --quiet <start-commit> -- .agro/skills/ste/scripts/ste-check.sh -> exit 0
changed files: fixture/ste-a.md 
worker line: Keep the check-logs and verify-configuration steps before deployment
metric=2 holdout=2 (current best metric=7 holdout=7, current noise margin=0)
margin readings in run checkout: 2 2
decision=keep margin=0 reason=metric -5 over best, holdout 2 <= 7; keeps: Keep the check-logs and verify-configuration steps before deployment
894210da task: rsi v2-drill-a loop 2 keep

 .agro/tasks/v2-drill-a/rsi.tsv | 1 +
 fixture/ste-a.md               | 2 +-
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/v2-drill-a-loop-2
git-maintenance.sh: ran: git branch -D rsi/v2-drill-a-loop-2

## v2-drill-a report
RESULT retained gain: metric 10 -> 2, holdout 10 -> 2, loops 2
REVIEW loop 1 fb7d28d9: Keep the instruction to restart the service
REVIEW loop 2 18f8c54a: Keep the check-logs and verify-configuration steps before deployment
The holdout cannot confirm intent. A person confirms each REVIEW line before a merge.

## Preflight v2-drill-b
## Preflight v2-drill-b (run branch rsi/v2-drill, branch slug v2-drill, run slug v2-drill-b)
Slug: ok
Finished run: ok (no ledger)
Number: metric=9 holdout=9
Evaluator overlap: none; Task folder overlap: none; Skill overlap: none; Loops: 2 ok; Direction: min ok; Clean tree: 0 uncommitted
baseline readings: m1=9 h1=9 m2=9 h2=9
1b50d278 task: rsi v2-drill-b baseline

## v2-drill-b loop 1 dispatch: worker branch rsi/v2-drill-b-loop-1 at 1b50d278

## v2-drill-b loop 1 evaluation
evaluator check: git diff --quiet <start-commit> -- .agro/skills/ste/scripts/ste-check.sh -> exit 0
changed files: fixture/ste-b.md 
worker line: Keep the rule that settings change only when the task names them
metric=7 holdout=7 (current best metric=9 holdout=9, current noise margin=0)
margin readings in run checkout: 7 7
decision=keep margin=0 reason=metric -2 over best, holdout 7 <= 9; keeps: Keep the rule that settings change only when the task names them
f199d7d4 task: rsi v2-drill-b loop 1 keep

 .agro/tasks/v2-drill-b/rsi.tsv | 1 +
 fixture/ste-b.md               | 2 +-
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/v2-drill-b-loop-1
git-maintenance.sh: ran: git branch -D rsi/v2-drill-b-loop-1

## v2-drill-b loop 2 dispatch: worker branch rsi/v2-drill-b-loop-2 at f199d7d4

## v2-drill-b loop 2 evaluation
evaluator check: git diff --quiet <start-commit> -- .agro/skills/ste/scripts/ste-check.sh -> exit 0
changed files: fixture/ste-b.md 
worker line: Keep the instruction to delete the volume when the worker fails
metric=7 holdout=7 (current best metric=7 holdout=7, current noise margin=0)
decision=reject margin=- reason=metric 7 does not beat 7 by more than margin 0
c2ec2e53 task: rsi v2-drill-b loop 2 reject

 .agro/tasks/v2-drill-b/rsi.tsv | 1 +
 1 file changed, 1 insertion(+)
git-maintenance.sh: ran: git worktree remove --force /home/sandbox/harness/.worktrees/rsi/v2-drill-b-loop-2
git-maintenance.sh: ran: git branch -D rsi/v2-drill-b-loop-2

## v2-drill-b report
RESULT retained gain: metric 9 -> 7, holdout 9 -> 7, loops 2
REVIEW loop 1 1ac88e38: Keep the rule that settings change only when the task names them
The holdout cannot confirm intent. A person confirms each REVIEW line before a merge.

## Third invocation: same command as run A, --slug v2-drill-a
## Preflight v2-drill-a (run branch rsi/v2-drill, branch slug v2-drill, run slug v2-drill-a)
Slug: ok
Finished run: BLOCKED (ledger holds 2 loop rows of 2)
preflight exit=2
Finished run: clean up loop 2 (Resume step 7):
no loop 2 branch: nothing to clean up
no loop 2 worktree: nothing to clean up
RESULT retained gain: metric 10 -> 2, holdout 10 -> 2, loops 2
REVIEW loop 1 fb7d28d9: Keep the instruction to restart the service
REVIEW loop 2 18f8c54a: Keep the check-logs and verify-configuration steps before deployment
The holdout cannot confirm intent. A person confirms each REVIEW line before a merge.
BLOCKED: Finished run. .agro/tasks/v2-drill-a/rsi.tsv holds 2 loop rows of 2. Give a new run a new --slug.

## Ledgers (columns: loop commit metric holdout decision reason margin)
--- .agro/tasks/v2-drill-a/rsi.tsv
0	dcb93c93	10	10	baseline	<invocation>	-
0	dcb93c93	10	10	baseline	evaluator=.agro/skills/ste/scripts/ste-check.sh	0
1	fb7d28d9	7	7	keep	metric -3 over best, holdout 7 <= 10; keeps: Keep the instruction to restart the service	0
2	18f8c54a	2	2	keep	metric -5 over best, holdout 2 <= 7; keeps: Keep the check-logs and verify-configuration steps before deployment	0
all rows 7 columns
--- .agro/tasks/v2-drill-b/rsi.tsv
0	894210da	9	9	baseline	<invocation>	-
0	894210da	9	9	baseline	evaluator=.agro/skills/ste/scripts/ste-check.sh	0
1	1ac88e38	7	7	keep	metric -2 over best, holdout 7 <= 9; keeps: Keep the rule that settings change only when the task names them	0
2	d602dc44	7	7	reject	metric 7 does not beat 7 by more than margin 0	-
all rows 7 columns

c2ec2e53 task: rsi v2-drill-b loop 2 reject
f199d7d4 task: rsi v2-drill-b loop 1 keep
1b50d278 task: rsi v2-drill-b baseline
894210da task: rsi v2-drill-a loop 2 keep
e206b948 task: rsi v2-drill-a loop 1 keep
ddc7d094 task: rsi v2-drill-a baseline
0
git-maintenance.sh: ran: git worktree remove --force .worktrees/rsi/v2-drill
Deleted branch rsi/v2-drill (was c2ec2e53).
git-maintenance.sh: ran: git branch -D rsi/v2-drill
remaining drill worktrees and branches: 0 0
```
