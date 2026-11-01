# Exercise 13: a missing field is skipped, not failed

Write a test that verifies an event without `amount` produces a `skipped` row, not a `failed` one. Then introduce a bug to check that the test catches it.

After exercise 12, your Engine already handles this case correctly. Test the run rows, rather than only the return value of `handleEvent`, because those rows are what `runs list` shows and what checkpoint 17 stores in SQLite.

1. Write the test in `test/Engine.test.ts`, in a `test/` directory alongside `src/`. Build the layer from `Engine.layer`, `RuleStore.layerMemory`, `RunLog.layerMemory` and a `FileSystem.makeNoop` whose `writeFileString` and `writeFile` record the paths they receive. Pass this layer to `layer` from `@effect/vitest`. Store a rule with the `amount gt 500` condition, submit `{ type: "expense", description: "no amount" }`, and read the rows back with `RunLog.list()`. Assert that:
   - there is exactly one row, for that rule, with outcome `skipped`;
   - its `reason` matches `/amount/`;
   - its `error` is null, because a skip is not an error;
   - nothing was written.

   Run `pnpm test test/Engine.test.ts` and confirm that it passes. The filter also matches the reference tests in `checkpoints/13/test/Engine.test.ts`. Those tests run against the checkpoint, not your `src/`, so they will keep passing throughout the steps below.

2. Introduce a bug in `src/Engine.ts` by changing the `MissingField` catch to omit the field from the reason:

   ```ts
   (error) => Effect.succeed<RunResult>({ outcome: "skipped", reason: "no match" })
   ```

   `pnpm check` still passes, because a wrong reason is still a valid string. Only the test can catch this.

3. Run `pnpm test test/Engine.test.ts` again. It fails on the reason with `expected 'no match' to match /amount/`, which confirms that the test can see the bug.

4. Put the original line back: `` reason: `missing field ${error.field}` ``.

With the line restored, `pnpm test test/Engine.test.ts` and `pnpm check` both pass again.

The test is in `solution/test/`.
