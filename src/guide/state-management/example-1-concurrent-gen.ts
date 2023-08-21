import { Effect } from "effect"
import * as Counter from "./Counter"

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const counter = yield* _(Counter.make)

  const logCounter = <R, E, A>(effect: Effect.Effect<R, E, A>) =>
    Effect.gen(function* (_) {
      const value = yield* _(counter.get)
      yield* _(Effect.log(`get: ${value}`))
      return yield* _(effect)
    })

  yield* _(
    counter.inc.pipe(
      Effect.zip(logCounter(counter.inc), { concurrent: true }),
      Effect.zip(logCounter(counter.dec), { concurrent: true }),
      Effect.zip(logCounter(counter.inc), { concurrent: true })
    )
  )
  const value = yield* _(counter.get)
  yield* _(Effect.log(`This counter has a value of ${value}.`))
})

Effect.runSync(program)
/*
Output:
... fiber=#2 message="get: 0"
... fiber=#4 message="get: 1"
... fiber=#6 message="get: 1"
... fiber=#0 message="This counter has a value of 2."
*/
