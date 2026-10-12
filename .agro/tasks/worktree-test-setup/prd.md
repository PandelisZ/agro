# PRD: Worktree test setup

Status: DRAFT

## User Stories

### US-001: State the install step in the worktree procedures

**Description:** As an agent, I want each worktree procedure to name the dependency install so that `pnpm test` and `pnpm run typecheck` pass in a new worktree.

**Acceptance Criteria:**

- [ ] `.agro/skills/git/SKILL.md` § Worktrees states: after `git worktree add`, run `pnpm install --frozen-lockfile` in the new worktree when the worktree has a `package.json`.
- [ ] `.agro/skills/worktrees/SKILL.md` § CREATE — new branch and § CREATE — existing branch include the same install command after `git worktree add`.
- [ ] `.agro/skills/delegate/SKILL.md` § Waves step 3 tells the advisor to run the install in each worker worktree before dispatch.
- [ ] `bash .agro/skills/ste/scripts/ste-check.sh` exits 0 on each changed file.
- [ ] In a new worktree, `pnpm install --frozen-lockfile`, then `pnpm run typecheck` and `pnpm test` exit 0.

## Summary

Issue #1417: a worktree under `.worktrees/` has no root `node_modules`. Four test suites then fail with `Cannot find package 'yaml'`. Each worktree of #1413, #1418, and #1423 needed `pnpm install --frozen-lockfile` before the checks passed. The issue accepts a procedure change as the fix. The pnpm store links packages, so the install is fast.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/skills/git/SKILL.md` | § Worktrees | Canonical worktree policy |
| `.agro/skills/worktrees/SKILL.md` | § CREATE | Worktree procedures |
| `.agro/skills/delegate/SKILL.md` | § Waves | Worker worktree setup |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Skill text | Changed | One install step after each `git worktree add` |

## Storage

N/A. The change adds no state.

## Architectural Decisions

- Fix the procedure, not the tool. A post-checkout hook would run on every checkout and slow each branch switch (YAGNI).

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| N/A | The change is skill prose. The fresh-worktree command run in US-001 proves the procedure. | US-001 |

## Design Principles

- One install step, in the canonical procedures only.

## Out of Scope

- A git hook or a CLI verb that installs dependencies.
- An evidence story: the change has no user interface, server, CLI, or API surface. The US-001 command run is the proof.

## Open Questions

None.

## Acceptance Criteria

- [ ] Each worktree procedure names `pnpm install --frozen-lockfile`.
- [ ] `pnpm run typecheck` and `pnpm test` exit 0 in a new worktree after the install.

## Lessons

1. Claim: `.agro/skills/worktrees/SKILL.md` held 9 STE findings before this task. Evidence: `ste-check.sh` exited 1 on the committed file. Outcome: fixed in this PR, because the PR changes the file and its acceptance criterion requires exit 0.
