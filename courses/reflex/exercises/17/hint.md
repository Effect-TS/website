# Exercise 17: `runs list --rule <id>` in SQL

`pnpm cli runs list --rule <id>` gives the right rows against SQLite, just as it did against the Map. But look at how it gets them. `RunLog.layerSql` reads every row of `runs`, newest first, and then filters and slices them in TypeScript, exactly like the memory layer does. With a few interval rules, that table grows by thousands of rows a day, and every `runs list --rule` reads all of them to keep a handful. Make SQLite do the work instead.

- In `src/RunLog.ts`, give the `findAll` query a request schema with the two options: `Schema.Struct({ ruleId: Schema.optional(Schema.String), limit: Schema.optional(Schema.Number) })`. `execute` now receives them.
- The filter should only be there when a rule id is given. `sql.and` takes a list of clauses and joins them with `AND`, and an empty list becomes `1=1`. So `WHERE ${sql.and(ruleId === undefined ? [] : [sql`rule_id = ${ruleId}`])}` is the whole condition. The value goes in as a parameter, never into the SQL text.
- Add `LIMIT ${limit ?? -1}`. In SQLite, a negative limit means no limit.
- `list` then just calls `findAll(options ?? {})`. Nothing in the Engine, the API or the CLI changes. The RunLog suite from lesson 13, run against both layers, confirms that the answers didn't change either.

You don't need a new index. `migrations/0002_runs.sql` already has one on `(rule_id, started_at)`, and that's the one this query uses.

Check: `pnpm test` stays green, and with the server running, `pnpm cli runs list --rule <id> --limit 2` prints at most two rows, all for that rule.

The changed file is in `solution/`. From lesson 18 on, the checkpoints include this change.
