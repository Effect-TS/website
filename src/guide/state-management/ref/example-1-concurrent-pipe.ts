import { Effect } from "effect"
import * as Counter from "./Counter"

// $ExpectType Effect<never, never, void>
const program = Counter.make.pipe(
  Effect.flatMap((counter) => {
    const logCounter = <R, E, A>(action: Effect.Effect<R, E, A>) =>
      counter.get.pipe(
        Effect.flatMap((value) => Effect.log(`get: ${value}`)),
        Effect.flatMap(() => action)
      )

    return counter.inc.pipe(
      Effect.zip(logCounter(counter.inc), { concurrent: true }),
      Effect.zip(logCounter(counter.dec), { concurrent: true }),
      Effect.zip(logCounter(counter.inc), { concurrent: true }),
      Effect.flatMap(() => counter.get),
      Effect.flatMap((value) =>
        Effect.log(`This counter has a value of ${value}.`)
      )
    )
  })
)

Effect.runPromise(program)
/*
Output:
... fiber=#2 message="get: 0"
... fiber=#4 message="get: 1"
... fiber=#6 message="get: 1"
... fiber=#0 message="This counter has a value of 2."
*/
