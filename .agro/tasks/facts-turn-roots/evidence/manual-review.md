# Manual review: facts turn roots

This file records the reviewer steps for issue #1422. The steps use the server, CLI, or API shape. Each expected result comes from an observed run.

The fixture `.agro/scripts/__tests__/fixtures/behavioral-training/facts/turn-root-session.jsonl` holds one synthetic session with these events, in this sequence:

1. `b-1`: a guard block in trace `t-1`.
2. `a-1`: an assistant generation in trace `t-1`.
3. `r-1`: a root observation in trace `t-2`. Its parent is `carrier-SYNTHETIC`. Its `isRootObservation` value is `true`.
4. `b-2`: a Bash call in trace `t-2`.

- Pre-fix commit: `741a49107b903f7efe1e2e876659fb6caa623c86` (the failing tests).
- Fix commit: `88a84da81fdb094ffd62fb30b17ae5e40fb6b906`.

**A. After the change**

Prerequisites: a checkout of branch `bug/1422-facts-turn-roots-us001` at the fix commit or later. Run `pnpm install` first. Run each command in the sandbox, local, from the root of the checkout.

1. Run the facts tests:

   ```bash
   npx vitest run .agro/scripts/__tests__/behavioral-training-facts.test.ts
   ```

   Expected output contains `Tests  38 passed (38)`. Expected exit status: 0.

2. Print the `guardBlocks` facts of the fixture:

   ```bash
   node --input-type=module -e 'const [m, f] = process.argv.slice(1); const { fileLines, sessionFactStream } = await import(m); for await (const item of sessionFactStream(fileLines(f))) console.log(JSON.stringify(item.facts.guardBlocks));' "$PWD/.agro/skills/behavioral-training/scripts/lib/facts.mjs" .agro/scripts/__tests__/fixtures/behavioral-training/facts/turn-root-session.jsonl
   ```

   Expected output: `[{"observationId":"b-1","remedy":"ask-user","nextObservationId":"r-1","followUp":"obeyed"}]`. Expected exit status: 0. The root observation `r-1` ends the follow-up. The Bash call `b-2` stays out of the follow-up.

**B. Before the change (failure path)**

Prerequisites: the same checkout as in scenario A. Run each command in the sandbox, local, from the root of the checkout.

1. Extract the pre-fix commit to a temporary directory and run the facts tests there:

   ```bash
   REVIEW_DIR=$(mktemp -d)
   git archive 741a49107b903f7efe1e2e876659fb6caa623c86 | tar -x -C "$REVIEW_DIR"
   ln -s "$PWD/node_modules" "$REVIEW_DIR/node_modules"
   ln -s "$PWD/.agro/cli/node_modules" "$REVIEW_DIR/.agro/cli/node_modules"
   (cd "$REVIEW_DIR" && npx vitest run .agro/scripts/__tests__/behavioral-training-facts.test.ts)
   ```

   Expected output, trimmed:

   ```text
    FAIL  .agro/scripts/__tests__/behavioral-training-facts.test.ts > guard blocks > ends the follow-up at a root observation that has a carrier parent in another trace
    FAIL  .agro/scripts/__tests__/behavioral-training-facts.test.ts > guard blocks > reads the turn-root fixture as an obeyed block
    Test Files  1 failed (1)
         Tests  2 failed | 36 passed (38)
   ```

   Expected exit status of the `npx vitest run` command: 1. The test `does not end the follow-up at a non-root observation with a parent in another trace` passes before and after the change.

2. Print the `guardBlocks` facts of the fixture with the pre-fix `facts.mjs`:

   ```bash
   node --input-type=module -e 'const [m, f] = process.argv.slice(1); const { fileLines, sessionFactStream } = await import(m); for await (const item of sessionFactStream(fileLines(f))) console.log(JSON.stringify(item.facts.guardBlocks));' "$REVIEW_DIR/.agro/skills/behavioral-training/scripts/lib/facts.mjs" .agro/scripts/__tests__/fixtures/behavioral-training/facts/turn-root-session.jsonl
   ```

   Expected output: `[{"observationId":"b-1","remedy":"ask-user","nextObservationId":"b-2","followUp":"unclear"}]`. Expected exit status: 0. The pre-fix code does not stop at `r-1`, so the Bash call `b-2` enters the follow-up.

**C. Cleanup**

1. Remove the temporary directory from scenario B:

   ```bash
   rm -r "$REVIEW_DIR"
   ```

   Expected exit status: 0.

## Verification

The worker ran these commands in the task worktree at the fix commit:

- `pnpm run typecheck`: exit status 0.
- `pnpm test`: exit status 0. Output: `Tests  2405 passed | 2 skipped (2407)`.
- `pnpm run build`: exit status 0.
