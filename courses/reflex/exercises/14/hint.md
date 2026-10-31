# Exercise 14: a limit the server can trust

Goal: make `GET /runs?limit=` accept only a whole number greater than 0.

`limit=abc` already gets a 400, because the query schema says `limit` is a number. But `limit=-1` comes back with every run except the oldest, since `RunLog.list` hands the number to `slice`, and `limit=1.5` is accepted as if it meant something.

1. In `src/api/Api.ts`, in the query of the `runs` group, make `limit` a whole number greater than 0. `Schema.Int` is a `Number` checked with `Schema.isInt()`, and `.check(Schema.isGreaterThan(0))` adds the lower bound.
2. Leave `src/server/Api.ts` and `src/RunLog.ts` alone. A request that fails the query schema never reaches a handler.

Check, with `pnpm dev:server` running:

```sh
curl -i 'localhost:3000/runs?limit=-1'
curl -i 'localhost:3000/runs?limit=1.5'
curl -i 'localhost:3000/runs?limit=2'
```

The first two answer 400, and the last answers 200. To compare with the state before the exercise, run `pnpm checkpoint 14 server`.

The changed file is in `solution/`. From checkpoint 15 on, the checkpoints include this change. The CLI's client in lesson 15 is derived from this same API and checks the same schema before it sends anything, so `pnpm cli runs list --limit 0` fails without making a request.
