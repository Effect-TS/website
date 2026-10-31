# Exercise 12: a reason on skipped

`pnpm checkpoint 12` prints `huge expense: skipped`, and nothing says why. A skipped run should keep its explanation in the run history, in the `reason` column: the condition that was false, or the field that was missing.

- `RunResult` in `src/RunLog.ts` decides what `finish` accepts. Give the `skipped` member a `reason: Schema.String`. The compiler now lists every place that writes a skip without one.
- In `src/Engine.ts` there are three: the condition was false, the action has no implementation yet, and the `MissingField` catch. The caught error carries `field`; use it, as `missing field amount`.
- `columns` already copies `reason` into the row when the result has one. Nothing in the memory `RunLog` changes.
- `failed` keeps its three fixed reasons. Do not add a fourth: the `runs` table in `migrations/0002_runs.sql` only accepts `status`, `timeout` or `io` on a failed row, and lesson 17 stores these rows there.

Check: `pnpm tsx src/main.ts` prints each skip with its reason in brackets, as `pnpm checkpoint 13` does.

The changed files are in `solution/`. From lesson 13 on, the checkpoints include this change.
