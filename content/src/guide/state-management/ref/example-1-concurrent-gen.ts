import { Effect } from "effect"
import * as Counter from "./Counter"

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const counter = yield* _(Counter.make)

  const logCounter = <R, E, A>(label: string, effect: Effect.Effect<R, E, A>) =>
    Effect.gen(function* (_) {
      const value = yield* _(counter.get)
      yield* _(Effect.log(`${label} get: ${value}`))
      return yield* _(effect)
    })

  yield* _(
    logCounter("task 1", counter.inc).pipe(
      Effect.zip(logCounter("task 2", counter.inc), { concurrent: true }),
      Effect.zip(logCounter("task 3", counter.dec), { concurrent: true }),
      Effect.zip(logCounter("task 4", counter.inc), { concurrent: true })
    )
  )
  const value = yield* _(counter.get)
  yield* _(Effect.log(`This counter has a value of ${value}.`))
})

Effect.runPromise(program)
/*
Output:
... fiber=#2 message="task 4 get: 0"
... fiber=#4 message="task 3 get: 1"
... fiber=#5 message="task 1 get: 0"
... fiber=#5 message="task 2 get: 1"
... fiber=#0 message="This counter has a value of 2."
*/
