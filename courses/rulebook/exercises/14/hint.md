# Exercise 14: a limit the server can trust

`GET /runs?limit=abc` already gets a 400, because the query schema says `limit` is a number. But `limit=-1` comes back with every run except the oldest, since `RunLog.list` hands the number to `slice`. And `limit=1.5` is accepted as if it meant something. The schema lets through numbers that aren't a count.

- What reaches the handler is decided by the query of the `runs` group in `src/api/Api.ts`. Make `limit` a whole number greater than 0 there. `Schema.Int` is a `Number` checked with `Schema.isInt()`, and `.check(Schema.isGreaterThan(0))` adds the lower bound.
- You don't need to change `src/server/Api.ts` or `src/RunLog.ts`. A request that fails the query schema never reaches a handler.

Check, with `pnpm dev:server` running:

```sh
curl -i 'localhost:3000/runs?limit=-1'
curl -i 'localhost:3000/runs?limit=1.5'
curl -i 'localhost:3000/runs?limit=2'
```

The first two answer 400, and the last answers 200. `pnpm checkpoint 14 server` serves the lesson's state before the exercise, if you want to compare.

The changed file is in `solution/`. From lesson 15 on, the checkpoints include this change. In lesson 15, the CLI's client is derived from this same API and checks the same schema before it sends anything, so `pnpm cli runs list --limit 0` fails without making a request.
