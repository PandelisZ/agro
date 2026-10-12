# PRD: `agro node` verbs for console sandbox nodes

Status: BLOCKED

## User Stories

### US-001: Resolve the console URL and API key

**Description:** As an operator, I want `agro` to find the console URL and API key so that each `agro node` verb can call the console API.

**Acceptance Criteria:**

- [ ] `SECRET_KEYS` in `.agro/cli/src/lib/secrets.ts` contains `AGRO_CONSOLE_URL` and `AGRO_CONSOLE_TOKEN`.
- [ ] `COMPOSE_SECRET_KEYS` does not contain `AGRO_CONSOLE_URL` or `AGRO_CONSOLE_TOKEN`.
- [ ] When the process environment sets a key, the resolver uses the environment value. Otherwise the resolver uses `readSecret` on the project root.
- [ ] When either value is missing, each `agro node` verb exits 1 and prints `set AGRO_CONSOLE_URL and AGRO_CONSOLE_TOKEN, or run agro secret set <KEY>`.
- [ ] The resolver never prints the token.
- [ ] A test in `.agro/cli/src/__tests__/node.test.ts` covers the environment value, the `.env` fallback, and the missing-value error.

### US-002: Add `agro node create`

**Description:** As an operator, I want `agro node create` to provision a sandbox node and wait for `running` so that I get an SSH command in one step.

**Acceptance Criteria:**

- [ ] `agro node create --spec <spec> --ssh-key <uuid> [--ssh-key <uuid>] [--name <name>]` sends `POST <AGRO_CONSOLE_URL>/api/nodes` with `Authorization: Bearer <token>` and body `{"profile":"sandbox","spec":...,"sshKeyIds":[...]}`.
- [ ] After HTTP 202, the verb polls `GET /api/nodes/<id>` until the status is `running` or a failure status, for at most 15 minutes.
- [ ] When the node reaches `running`, the verb prints the node id, the status, and `ssh sandbox@<ipv4>`, then exits 0.
- [ ] When the node reaches a failure status or the 15-minute limit passes, the verb prints the node id and the last status, then exits 1.
- [ ] When the API returns a status of 400 or higher, the verb prints the HTTP status and the `code` field, then exits 1.
- [ ] `--json` prints one JSON object with `id`, `status`, and `ssh`.
- [ ] `.agro/cli/src/__tests__/node.test.ts` covers each criterion above against a stub `fetch`.

### US-003: Add `agro node list` and `agro node delete`

**Description:** As an operator, I want to list and delete console nodes from `agro` so that I can clean up sandbox nodes without the browser.

**Acceptance Criteria:**

- [ ] `agro node list [--json]` sends `GET /api/nodes` and prints one row per node: id, name, profile, status, and IPv4.
- [ ] `agro node delete <id> [--yes]` asks for confirmation unless `--yes` is present, then sends `DELETE /api/nodes/<id>`.
- [ ] When `DELETE` returns 403, the verb prints `destroy needs the admin role in agro-console` and exits 1.
- [ ] `.agro/cli/src/__tests__/node.test.ts` covers list, delete, the confirmation, and the 403 message.

### US-004: Document the `agro node` verbs

**Description:** As an operator, I want the verb reference to list `agro node` so that I can find the verbs and the configuration.

**Acceptance Criteria:**

- [ ] `docs/lifecycle-commands.md` lists `agro node create`, `agro node list`, and `agro node delete` in the verb table.
- [ ] `docs/lifecycle-commands.md` has a section that names `AGRO_CONSOLE_URL`, `AGRO_CONSOLE_TOKEN`, and the `agro secret set` fallback.
- [ ] The section states that `agro node` manages remote console VMs, not local Docker sandboxes.
- [ ] `agro --help` lists `agro node`.
- [ ] The docs reference tests in `.agro/cli/src/__tests__/docs-reference.test.ts` exit 0.

### US-005: Record manual review evidence

**Description:** As the advisor, I want a transcript of each verb against a live console so that the PR proves the behavior end to end.

**Acceptance Criteria:**

- [ ] With operator approval, the agent runs `agro node create`, `agro node list`, and `agro node delete` against the dev console with an `mfc_` token.
- [ ] The agent writes the transcript, with the token redacted, to `.agro/tasks/agro-node-verbs/evidence/manual-review.md`.
- [ ] Over SSH on the node, `command -v agro code-server` prints nothing.
- [ ] The agent destroys each node that the review created.

## Summary

The harness CLI has no verb that calls agro-console. `agro secret` reads and writes the gitignored project `.env` (`.agro/cli/src/lib/secrets.ts`). agro-console accepts `mfc_` bearer tokens on `POST /api/nodes`. The agro-console task `node-sandbox-profile` adds the request field `profile`.

This task adds `agro node create|list|delete`. Each verb calls the console API with an API key. `create` always sends `profile: "sandbox"`.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `.agro/cli/src/lib/secrets.ts` | `SECRET_KEYS`, `readSecret` | Fallback store for the console URL and token |
| `.agro/cli/src/commands/node.ts` | new `runNode` | Verb handlers and the API client |
| `.agro/cli/src/cli.ts` | top-level dispatch, near the `egress` and `workspace` branches | Route `agro node` |
| `.agro/cli/src/__tests__/node.test.ts` | new | Verb tests with a stub `fetch` |
| `docs/lifecycle-commands.md` | verb table | Verb reference |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| `agro node create` | New verb | Create a sandbox node and wait for `running` |
| `agro node list` | New verb | List console nodes |
| `agro node delete` | New verb | Destroy one console node |
| `agro secret set` | New keys | `AGRO_CONSOLE_URL`, `AGRO_CONSOLE_TOKEN` |

## Storage

N/A: the verbs keep no state. The project `.env` holds the optional fallback values through the existing `agro secret` store.

## Architectural Decisions

- The console API is the source of truth for node state.
- The environment wins over the `.env` fallback.
- The task adds no credential file and no login verb.
- The 15-minute wait matches the console ready timeout (`apps/provisioner/src/services/ready-timeout.service.ts` in agro-console).

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `.agro/cli/src/__tests__/node.test.ts` | config resolution; create, poll, and timeout; API errors; list; delete and 403 | US-001, US-002, US-003 |
| `.agro/cli/src/__tests__/docs-reference.test.ts` | verb table lists `agro node` | US-004 |

Run `pnpm exec vitest run .agro/cli` and `npm --prefix .agro/cli run typecheck` before Close.

## Design Principles

- `agro` stays the only lifecycle door.
- Never print or log the token.
- Use the term `sandbox` to match agro-console.
- Add no explanatory comments to tracked code.

## Out of Scope

- A login verb and a credential file.
- The `desktop` profile.
- Verbs other than create, list, and delete.

## Open Questions

1. This task depends on the agro-console task `node-sandbox-profile`. Start implementation after that PR merges.
2. Destroy is admin-only in agro-console. Must an operator key delete the operator's own sandbox node? The answer sets the expected result of `agro node delete` for an operator key.
3. Which field of `GET /api/nodes/<id>` holds the IPv4 address? Confirm the field name before US-002.

## Acceptance Criteria

- [ ] `pnpm exec vitest run .agro/cli` exits 0.
- [ ] `npm --prefix .agro/cli run typecheck` exits 0.
- [ ] `agro node create` against a live console prints an SSH command for a running sandbox node.

## Lessons

Filled by the advisor before undraft.
