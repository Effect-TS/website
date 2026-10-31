# Exercise 12: a reason on skipped

`pnpm checkpoint 12` prints `huge expense: skipped`, and nothing says why. A skipped run should keep its explanation in the run history, in the `reason` column. That explanation is either the condition that was false or the field that was missing.

- Start with `RunResult` in `src/RunLog.ts`. It decides what `finish` accepts. Give the `skipped` member a `reason: Schema.String`, and the compiler will list every place that writes a skip without one.
- In `src/Engine.ts` there are three: the condition was false, the action has no implementation yet, and the `MissingField` catch. The caught error carries `field`, so use it, as `missing field amount`.
- You don't need to touch the memory `RunLog`. `columns` already copies `reason` into the row when the result has one.
- Leave `failed` with its three fixed reasons, and don't add a fourth. The `runs` table in `migrations/0002_runs.sql` only accepts `status`, `timeout` or `io` on a failed row, and lesson 17 stores these rows there.

Check: `pnpm tsx src/main.ts` prints each skip with its reason in brackets, the same way `pnpm checkpoint 13` does.

The changed files are in `solution/`. From lesson 13 on, the checkpoints include this change.
