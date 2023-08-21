import { Effect } from "effect"

const program = Effect.forEach(
  [1, 2, 3],
  (n) =>
    Effect.gen(function* (_) {
      yield* _(Effect.log(`start #${n}`))
      yield* _(Effect.sleep(`${n} seconds`))
      if (n > 1) {
        yield* _(Effect.interrupt)
      }
      yield* _(Effect.log(`done #${n}`))
    }),
  { concurrency: "unbounded" }
)

Effect.runPromise(program).catch((error) =>
  console.log(`interrupted: ${error}`)
)
/*
Output:
timestamp=... level=INFO fiber=#1 message="start #1"
timestamp=... level=INFO fiber=#2 message="start #2"
timestamp=... level=INFO fiber=#3 message="start #3"
timestamp=... level=INFO fiber=#1 message="done #1"
interrupted: All fibers interrupted without errors.
*/
