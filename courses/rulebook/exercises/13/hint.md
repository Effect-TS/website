# Exercise 13: a missing field is skipped, not failed

An event without `amount` must not count as a failed rule: the rule does not apply to it. Write the test that says so, and assert it on the run rows, not only on what `handleEvent` returns. Rows are what `runs list` will show and what lesson 17 stores in SQLite.

Make it red first. Start the test from the lesson's `setup()` and `handle()` helpers, submit `{ type: "expense", description: "no amount" }` against a rule with the `amount gt 500` condition, and assert that the stored row's reason matches `/amount/`. Run `pnpm test` before you change `src/Engine.ts`: if the `MissingField` catch still writes a skip without a reason, the test fails on that line, and the failure message shows the row it got. That red is the point: it proves the test can see the bug.

Then make it green and add the rest of what the row should say:

- exactly one row, for that rule, with outcome `skipped`;
- the reason names the field;
- `error` is null, because a skip is not an error;
- nothing was written to `alerts.log`.

Check: `pnpm test` is green.

`solution/` points at the reference test.
