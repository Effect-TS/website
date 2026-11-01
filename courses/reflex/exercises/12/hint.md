# Exercise 12: record why a run was skipped

Store an explanation for every `skipped` run in the run history's `reason` column.

`pnpm checkpoint 12` prints `huge expense: skipped` without explaining why. For this run, the explanation should identify either the condition that was false or the field that was missing.

1. In `src/RunLog.ts`, add `reason: Schema.String` to the `skipped` member of `RunResult`. This type determines what `finish` accepts, so the compiler will report every place that records a skip without a reason.
2. Add a reason at each of the three reported locations in `src/Engine.ts`:
   - When the condition is false, say which condition it was.
   - When the action has no implementation yet, say that `httpPost` actions run from lesson 20.
   - In the `MissingField` catch, use the error's `field` to produce a reason such as `missing field amount`.
3. Leave the memory `RunLog` unchanged. `columns` already copies `reason` into the row when the result has one.
4. Keep the three fixed reasons for `failed`; do not add a fourth. The `runs` table in `migrations/0002_runs.sql` only accepts `status`, `timeout` or `io` on a failed row. Checkpoint 17 will store these rows in that table.

Run `pnpm tsx src/main.ts`. Each skip should now include its reason in brackets, as it does when you run `pnpm checkpoint 13`.

The changed files are in `solution/`. From checkpoint 13 on, the checkpoints include this change.
