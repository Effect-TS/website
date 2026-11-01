# Exercise 17: `runs list --rule <id>` in SQL

Move filtering and limiting for `runs list --rule <id>` into the SQLite query instead of reading every row and filtering in TypeScript.

`pnpm cli runs list --rule <id>` already returns the right rows with SQLite, but `RunLog.layerSql` gets them by reading every row of `runs`, newest first, and filtering and slicing in TypeScript just as the memory layer does. A few interval rules can add thousands of rows a day, and every `runs list --rule` then reads all of them to return a handful.

1. In `src/RunLog.ts`, give the `findAll` query a request schema for the two options: `Schema.Struct({ ruleId: Schema.optional(Schema.String), limit: Schema.optional(Schema.Number) })`. The options are then available in `execute`.
2. Add the filter only when a rule id is given. `sql.and` joins a list of clauses with `AND` and produces `1=1` for an empty list, so you can write the condition as ``WHERE ${sql.and(ruleId === undefined ? [] : [sql`rule_id = ${ruleId}`])}``. The rule id is passed as a parameter, never inserted into the SQL text.
3. Add `LIMIT ${limit ?? -1}`. In SQLite, a negative limit means no limit.
4. Make `list` call `findAll(options ?? {})`. Nothing changes in the Engine, the API or the CLI. Run the RunLog suite from checkpoint 13 against both layers to confirm they still agree.

You do not need a new index. `migrations/0002_runs.sql` already has one on `(rule_id, started_at)`, and this query uses it.

Confirm that `pnpm test` still passes. Then, with the server running, try `pnpm cli runs list --rule <id> --limit 2`. It prints at most two rows, all for that rule.

The changed file is in `solution/`. From checkpoint 18 on, the checkpoints include this change.
