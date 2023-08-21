import { Effect } from "effect"

const program = Effect.forEach(
  [1, 2, 3],
  (n) =>
    Effect.log(`start #${n}`).pipe(
      Effect.flatMap(() => {
        const effect = Effect.sleep(`${n} seconds`)
        if (n > 1) {
          return Effect.flatMap(effect, () => Effect.interrupt)
        } else {
          return effect
        }
      }),
      Effect.flatMap(() => Effect.log(`done #${n}`))
    ),
  { concurrency: "unbounded" }
)

Effect.runPromise(program).catch((error) =>
  console.log(`interrupted: ${error}`)
)
/*
timestamp=... level=INFO fiber=#1 message="start #1"
timestamp=... level=INFO fiber=#2 message="start #2"
timestamp=... level=INFO fiber=#3 message="start #3"
timestamp=... level=INFO fiber=#1 message="done #1"
interrupted: All fibers interrupted without errors.
*/
