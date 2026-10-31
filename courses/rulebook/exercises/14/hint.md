# Exercise 14: a limit the server can trust

`GET /runs?limit=abc` already gets a 400: the query schema says `limit` is a number. But `limit=-1` comes back with every run except the oldest, because `RunLog.list` hands it to `slice`. And `limit=1.5` is accepted as if it meant something. The schema lets through numbers that are not a count.

- The query of the `runs` group in `src/api/Api.ts` decides what reaches the handler. Make `limit` a whole number greater than 0: `Schema.Int` is a `Number` checked with `Schema.isInt()`, and `.check(Schema.isGreaterThan(0))` adds the lower bound.
- Nothing in `src/server/Api.ts` or `src/RunLog.ts` changes. A request that fails the query schema never reaches a handler.

Check, with `pnpm dev:server` running:

```sh
curl -i 'localhost:3000/runs?limit=-1'
curl -i 'localhost:3000/runs?limit=1.5'
curl -i 'localhost:3000/runs?limit=2'
```

The first two answer 400, the last 200. `pnpm checkpoint 14 server` serves the lesson's state before the exercise.

The changed file is in `solution/`. From lesson 15 on, the checkpoints include this change. The client the CLI derives from the API in lesson 15 checks the same schema before it sends anything, so `pnpm cli runs list --limit 0` fails without a request.
