# Exercise 14: validate the run limit

Make `GET /runs?limit=` accept only a whole number greater than 0.

The query schema already requires a number, so `limit=abc` returns a 400 response. It still accepts negative numbers and fractions, though. `limit=-1` returns every run except the oldest because `RunLog.list` passes the number to `slice`, and `limit=1.5` is accepted even though a row count must be a whole number.

1. Find the query schema for the `runs` group in `src/api/Api.ts` and make `limit` a whole number greater than 0. `Schema.Int` is a `Number` checked with `Schema.isInt()`. Add the lower bound with `.check(Schema.isGreaterThan(0))`.
2. Leave `src/server/Api.ts` and `src/RunLog.ts` unchanged. A request that fails the query schema never reaches a handler.

With `pnpm dev:server` running, try these requests:

```sh
curl -i 'localhost:3000/runs?limit=-1'
curl -i 'localhost:3000/runs?limit=1.5'
curl -i 'localhost:3000/runs?limit=2'
```

The first two should return 400, and the last should return 200. To compare with the state before the exercise, run `pnpm checkpoint 14 server`.

The changed file is in `solution/`, and the checkpoints include this change from checkpoint 15 onward. In lesson 15, the CLI's client is derived from this same API. It checks the schema before sending a request, so `pnpm cli runs list --limit 0` fails without contacting the server.
