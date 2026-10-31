# Exercise 17: `runs list --rule <id>` in SQL

`pnpm cli runs list --rule <id>` gives the right rows against SQLite, as it did against the Map. Look at how: `RunLog.layerSql` reads every row of `runs`, newest first, and then filters and slices them in TypeScript, exactly like the memory layer. With a few rules on intervals, that table grows by thousands of rows a day, and every `runs list --rule` reads all of them to keep a handful. Make SQLite do the work.

- In `src/RunLog.ts`, give the `findAll` query a request schema with the two options: `Schema.Struct({ ruleId: Schema.optional(Schema.String), limit: Schema.optional(Schema.Number) })`. `execute` now receives them.
- The filter is only there when a rule id is given. `sql.and` takes a list of clauses and joins them with `AND`; an empty list becomes `1=1`. So `WHERE ${sql.and(ruleId === undefined ? [] : [sql`rule_id = ${ruleId}`])}` is the whole condition. The value goes in as a parameter, never into the SQL text.
- `LIMIT ${limit ?? -1}`: in SQLite a negative limit means no limit.
- `list` then just calls `findAll(options ?? {})`. Nothing in the Engine, the API or the CLI changes, and the RunLog suite from lesson 13, run against both layers, says the answers did not change either.

`migrations/0002_runs.sql` already has an index on `(rule_id, started_at)`, which is the one this query uses.

Check: `pnpm test` stays green, and with the server running, `pnpm cli runs list --rule <id> --limit 2` prints at most two rows, all of that rule.

The changed file is in `solution/`. From lesson 18 on, the checkpoints include this change.
