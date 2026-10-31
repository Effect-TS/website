# Exercise 13: a missing field is skipped, not failed

An event without `amount` must not count as a failed rule: the rule does not apply to it. After exercise 12 your Engine already gets this right. Write the test that says so, and assert it on the run rows, not only on what `handleEvent` returns. Rows are what `runs list` will show and what lesson 17 stores in SQLite.

A test you have only seen pass has not shown it can fail. So you break the Engine on purpose, watch the test catch it, then put the line back.

1. Write the test in `test/Engine.test.ts`, next to `src/`. Build the layer from `Engine.layer`, `RuleStore.layerMemory`, `RunLog.layerMemory` and a `FileSystem.makeNoop` whose `writeFileString` and `writeFile` record the path they get, and hand it to `layer` from `@effect/vitest`. Store a rule with the `amount gt 500` condition, submit `{ type: "expense", description: "no amount" }` and read the rows back with `RunLog.list()`. Assert:
   - exactly one row, for that rule, with outcome `skipped`;
   - its `reason` matches `/amount/`;
   - its `error` is null, because a skip is not an error;
   - nothing was written.

   Run `pnpm test test/Engine.test.ts`. It passes. The filter also matches `checkpoints/13/test/Engine.test.ts`, the reference tests; they run against the checkpoint, not your `src/`, so they stay green through every step below.

2. Plant the bug. In `src/Engine.ts`, change the `MissingField` catch to drop the field from the reason:

   ```ts
   (error) => Effect.succeed<RunResult>({ outcome: "skipped", reason: "no match" })
   ```

   `pnpm check` still passes: the row is well-typed, it just says the wrong thing. Only a test can catch this.

3. Run `pnpm test test/Engine.test.ts` again. It fails on the reason, and the message shows the reason it got: `expected 'no match' to match /amount/`. That red is the point: it proves the test can see the bug.

4. Put the original line back: `` reason: `missing field ${error.field}` ``.

Check: `pnpm test test/Engine.test.ts` is green again, and `pnpm check` passes.

The test is in `solution/test/`.
