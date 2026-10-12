# Manual review: trace capture fidelity (#1418)

This file records one observed run on 2026-10-11. The run used the worktree
`task/1418-trace-capture-fidelity-us004` in the local sandbox. `$S` is the
scratch directory
`/tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004`.
`$W` is the worktree root. The run used fake keys only. The run made no network
call.

## Transcript

### 1. Build the CLI

```console
$ pnpm install --frozen-lockfile; echo install=$?
install=0
$ pnpm run build; echo build=$?
build=0
```

### 2. Make a throwaway project root and a temporary HOME

The CLI finds the project root from the current directory. It stops at the
first directory that holds a `.agro/` directory. The `agro.json` file enables
Langfuse with a fake base URL. The `.env` file holds the fake keys
`pk-lf-fake` and `sk-lf-fake`.

```console
$ mkdir -p $S/project/.agro $S/home $S/driver
$ printf 'LANGFUSE_PUBLIC_KEY=pk-lf-fake\nLANGFUSE_SECRET_KEY=sk-lf-fake\n' > $S/project/.env
$ printf '{\n  "version": 1,\n  "name": "us004-review",\n  "langfuse": { "enabled": true, "baseUrl": "https://langfuse.example.invalid", "environment": "us004-review" }\n}\n' > $S/project/agro.json
$ cat $S/project/agro.json
{
  "version": 1,
  "name": "us004-review",
  "langfuse": { "enabled": true, "baseUrl": "https://langfuse.example.invalid", "environment": "us004-review" }
}
```

### 3. Run `agro langfuse apply` with the temporary HOME

```console
$ cd $S/project && HOME=$S/home node $W/.agro/cli/dist/agro.js langfuse apply; echo "exit=$?"
agro: warning: /etc/agro/sandbox is missing; detected the sandbox from /.dockerenv and SANDBOX_NAME. Upgrade the sandbox image.
wrote     ~/.config/agro/langfuse.env
wrote     ~/.claude/settings.json
wrote     ~/.codex/langfuse.json
wrote     ~/.pi/agent/langfuse.json
exit=0
```

### 4. Read the rendered limits

`CC_LANGFUSE_MAX_CHARS` in the Claude Code settings file:

```console
$ jq -r .env.CC_LANGFUSE_MAX_CHARS $S/home/.claude/settings.json; echo "exit=$?"
100000
exit=0
```

`PI_LANGFUSE_MAX_CHARS` is in the credential fragment. The operator-only path
guard blocks each command that names the fragment directory. The run did not
read the fragment file. The renderer test asserts the exact fragment body,
which includes the line `PI_LANGFUSE_MAX_CHARS=100000`. The apply command in
step 3 writes the fragment with the same renderer.

```console
$ pnpm exec vitest run .agro/cli/src/lib/tracing/__tests__/langfuse-fragment.test.ts .agro/cli/src/lib/tracing/__tests__/harness-writers.test.ts
 Test Files  2 passed (2)
      Tests  41 passed (41)
exit=0
```

### 5. Run apply again

```console
$ cd $S/project && HOME=$S/home node $W/.agro/cli/dist/agro.js langfuse apply; echo "exit=$?"
agro: warning: /etc/agro/sandbox is missing; detected the sandbox from /.dockerenv and SANDBOX_NAME. Upgrade the sandbox image.
unchanged ~/.config/agro/langfuse.env
unchanged ~/.claude/settings.json
unchanged ~/.codex/langfuse.json
unchanged ~/.pi/agent/langfuse.json
exit=0
```

### 6. Failure path: apply outside the sandbox

```console
$ cd $S/project && HOME=$S/home AGRO_EXECUTION_TARGET=docker-compose node $W/.agro/cli/dist/agro.js langfuse apply; echo "exit=$?"
agro langfuse apply: ~/.claude and ~/.pi exist only in the sandbox — settings saved; run `agro langfuse apply` in the sandbox or restart it
exit=1
```

### 7. Count missing parents before and after the US-002 rule

The fixture is
`.agro/scripts/__tests__/fixtures/behavioral-training/normalize/claude-code-session.json`.
The fixture holds 8 observations. The output below holds aggregate counts only.

The "before" count from the fixture is the number of rows with a parent id that
is not a fixture id.

```console
$ jq '[.[].id] as $ids | [.[] | select(.parentObservationId != null and (.parentObservationId as $p | $ids | index($p) | not))] | {rows: length, rootRows: map(select(.isRootObservation == true)) | length}' $F
{
  "rows": 2,
  "rootRows": 2
}
exit=0
```

The driver `$S/driver/count-parents.mjs` calls `normalizeSession` and counts
the `parent` entries in `capture.missing`:

```js
import { readFileSync } from "node:fs";
const [, , modulePath, fixturePath] = process.argv;
const { normalizeSession } = await import(modulePath);
const observations = JSON.parse(readFileSync(fixturePath, "utf8"));
const records = normalizeSession(observations, {
  sessionId: observations[0].sessionId,
  projectId: "proj-synthetic",
  baseUrl: "https://langfuse.example.test",
  maxBytes: 10_000_000,
});
const missing = records.flatMap((record) => record.capture.missing);
const parentGaps = missing.filter((item) => item.kind === "parent").length;
console.log(JSON.stringify({ records: records.length, parentGaps, missingKinds: [...new Set(missing.map((item) => item.kind))] }));
```

Before, with `normalize.mjs` from the parent of commit `46601623`:

```console
$ git -C $W archive 46601623^ .agro/skills/behavioral-training/scripts/lib | tar -x -C $S/before
$ node $S/driver/count-parents.mjs $S/before/.agro/skills/behavioral-training/scripts/lib/normalize.mjs $F
{"records":1,"parentGaps":2,"missingKinds":["parent","inventory-record"]}
exit=0
```

After, with `normalize.mjs` in this worktree:

```console
$ node $S/driver/count-parents.mjs $W/.agro/skills/behavioral-training/scripts/lib/normalize.mjs $F
{"records":1,"parentGaps":0,"missingKinds":["inventory-record"]}
exit=0
```

| Count | Before | After |
|---|---|---|
| Rows with a parent id outside the fixture (jq) | 2 | 2 |
| Root rows among them (jq) | 2 | 2 |
| `parent` entries in `capture.missing` | 2 | 0 |

The `inventory-record` entry occurs because the driver gives no `expected`
inventory record. The entry is not a parent gap.

### 8. Delete the temporary HOME and the throwaway project root

```console
$ rm -rf /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004/home /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004/project; echo "exit=$?"
exit=0
$ test -e /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004/home && echo present || echo "home: gone"
home: gone
$ test -e /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004/project && echo present || echo "project: gone"
project: gone
$ rm -rf /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004
$ test -e /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004 && echo present || echo "scratch: gone"
scratch: gone
```

## Reviewer steps

**A. The capture limit in the generated files**

Prerequisites: a checkout of this branch after `pnpm install --frozen-lockfile`
and `pnpm run build`. A scratch directory `$S` that holds `project/.agro/`,
`project/agro.json`, and `project/.env` with fake keys, as in step 2. An empty
directory `$S/home`. Runs in the sandbox, local.

1. Run apply with the temporary HOME:

   ```bash
   cd $S/project && HOME=$S/home node $W/.agro/cli/dist/agro.js langfuse apply
   ```

   Expected output includes `wrote     ~/.claude/settings.json` and
   `wrote     ~/.pi/agent/langfuse.json`. Expected exit status: 0.

2. Read the Claude Code limit:

   ```bash
   jq -r .env.CC_LANGFUSE_MAX_CHARS $S/home/.claude/settings.json
   ```

   Expected output: `100000`. Expected exit status: 0.

3. Run the renderer tests for the Pi limit:

   ```bash
   pnpm exec vitest run .agro/cli/src/lib/tracing/__tests__/langfuse-fragment.test.ts .agro/cli/src/lib/tracing/__tests__/harness-writers.test.ts
   ```

   Expected output: `Tests  41 passed (41)`. Expected exit status: 0.

4. Run apply again. Expected output: each line starts with `unchanged`.
   Expected exit status: 0.

5. Failure path. Run apply as on the host:

   ```bash
   cd $S/project && HOME=$S/home AGRO_EXECUTION_TARGET=docker-compose node $W/.agro/cli/dist/agro.js langfuse apply
   ```

   Expected output: `agro langfuse apply: ~/.claude and ~/.pi exist only in the sandbox — settings saved; run `agro langfuse apply` in the sandbox or restart it`.
   Expected exit status: 1.

**B. Missing parents before and after the US-002 rule**

Prerequisites: the driver from step 7 at `$S/driver/count-parents.mjs`. `$F`
is the fixture path from step 7. Runs in the sandbox, local.

1. Run the driver on the worktree module:

   ```bash
   node $S/driver/count-parents.mjs $W/.agro/skills/behavioral-training/scripts/lib/normalize.mjs $F
   ```

   Expected output: `{"records":1,"parentGaps":0,"missingKinds":["inventory-record"]}`.
   Expected exit status: 0.

2. Failure path. Run the driver on the module before commit `46601623`:

   ```bash
   git -C $W archive 46601623^ .agro/skills/behavioral-training/scripts/lib | tar -x -C $S/before
   node $S/driver/count-parents.mjs $S/before/.agro/skills/behavioral-training/scripts/lib/normalize.mjs $F
   ```

   Expected output: `{"records":1,"parentGaps":2,"missingKinds":["parent","inventory-record"]}`.
   Expected exit status: 0.

**C. Cleanup**

1. Delete the scratch directory with the literal path:

   ```bash
   rm -rf /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004
   test -e /tmp/claude-1000/-home-sandbox-harness/ede4b012-6a97-486a-ae0f-1f9ac4d8f2c8/scratchpad/1418-us004 && echo present || echo "scratch: gone"
   ```

   Expected output: `scratch: gone`. Expected exit status: 0.
