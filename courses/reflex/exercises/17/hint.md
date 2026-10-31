# Exercise 17: `runs list --rule <id>` in SQL

Goal: make SQLite filter and limit the rows for `runs list --rule <id>`, instead of reading every row and filtering in TypeScript.

`pnpm cli runs list --rule <id>` already gives the right rows against SQLite. But `RunLog.layerSql` reads every row of `runs`, newest first, then filters and slices them in TypeScript, exactly like the memory layer does. With a few interval rules that table grows by thousands of rows a day, and every `runs list --rule` reads all of them to keep a handful.

1. In `src/RunLog.ts`, give the `findAll` query a request schema with the two options: `Schema.Struct({ ruleId: Schema.optional(Schema.String), limit: Schema.optional(Schema.Number) })`. `execute` now receives them.
2. Add the filter only when a rule id is given. `sql.and` takes a list of clauses and joins them with `AND`, and an empty list becomes `1=1`. So `WHERE ${sql.and(ruleId === undefined ? [] : [sql`rule_id = ${ruleId}`])}` is the whole condition. The value goes in as a parameter, never into the SQL text.
3. Add `LIMIT ${limit ?? -1}`. In SQLite, a negative limit means no limit.
4. Make `list` call `findAll(options ?? {})`. Nothing in the Engine, the API or the CLI changes. The RunLog suite from checkpoint 13, run against both layers, confirms that the answers did not change either.

You do not need a new index. `migrations/0002_runs.sql` already has one on `(rule_id, started_at)`, and this query uses it.

Check: `pnpm test` stays green, and with the server running, `pnpm cli runs list --rule <id> --limit 2` prints at most two rows, all for that rule.

The changed file is in `solution/`. From checkpoint 18 on, the checkpoints include this change.
