# Exercise 14: validate the run limit

Make `GET /runs?limit=` accept only a whole number greater than 0.

The query schema already requires a number, so `limit=abc` gets a 400 response. Negative numbers and fractions still get through, though: `limit=-1` returns every run except the oldest, because `RunLog.list` passes the number straight to `slice`, and `limit=1.5` is accepted even though a row count has to be a whole number.

1. Find the query schema for the `runs` group in `src/api/Api.ts` and make `limit` a whole number greater than 0. `Schema.Int` is a `Number` checked with `Schema.isInt()`. Add the lower bound with `.check(Schema.isGreaterThan(0))`.
2. Leave `src/server/Api.ts` and `src/RunLog.ts` unchanged. A request that fails the query schema never reaches a handler.

With `pnpm dev:server` running, try these requests:

```sh
curl -i 'localhost:3000/runs?limit=-1'
curl -i 'localhost:3000/runs?limit=1.5'
curl -i 'localhost:3000/runs?limit=2'
```

The first two return 400 and the last returns 200. To compare with the state before the exercise, run `pnpm checkpoint 14 server`.

The changed file is in `solution/`, and the checkpoints include this change from checkpoint 15 on. From lesson 15 the CLI's client is derived from the same API, so it checks the schema before sending anything, and `pnpm cli runs list --limit 0` fails without contacting the server.
