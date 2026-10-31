# Exercise 12: a reason on skipped

Goal: keep the explanation for every `skipped` run in the run history's `reason` column.

`pnpm checkpoint 12` prints `huge expense: skipped`, and nothing says why. The reason is either the condition that was false or the field that was missing.

1. In `src/RunLog.ts`, give the `skipped` member of `RunResult` a `reason: Schema.String`. `RunResult` decides what `finish` accepts, so the compiler now lists every place that writes a skip without a reason.
2. In `src/Engine.ts`, fill in the three places it lists:
   - the condition was false: say which condition;
   - the action has no implementation yet: say that `httpPost` actions run from lesson 20;
   - the `MissingField` catch: use the error's `field`, as `missing field amount`.
3. Leave the memory `RunLog` alone. `columns` already copies `reason` into the row when the result has one.
4. Leave `failed` with its three fixed reasons. Do not add a fourth. The `runs` table in `migrations/0002_runs.sql` only accepts `status`, `timeout` or `io` on a failed row, and checkpoint 17 stores these rows there.

Check: `pnpm tsx src/main.ts` prints each skip with its reason in brackets, the same way `pnpm checkpoint 13` does.

The changed files are in `solution/`. From checkpoint 13 on, the checkpoints include this change.
