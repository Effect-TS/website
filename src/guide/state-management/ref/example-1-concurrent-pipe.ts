import { Effect } from "effect"
import * as Counter from "./Counter"

// $ExpectType Effect<never, never, void>
const program = Counter.make.pipe(
  Effect.flatMap((counter) => {
    const logCounter = <R, E, A>(
      label: string,
      effect: Effect.Effect<R, E, A>
    ) =>
      counter.get.pipe(
        Effect.flatMap((value) => Effect.log(`${label} get: ${value}`)),
        Effect.flatMap(() => effect)
      )

    return logCounter("task 1", counter.inc).pipe(
      Effect.zip(logCounter("task 2", counter.inc), { concurrent: true }),
      Effect.zip(logCounter("task 3", counter.dec), { concurrent: true }),
      Effect.zip(logCounter("task 4", counter.inc), { concurrent: true }),
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
... fiber=#2 message="task 4 get: 0"
... fiber=#4 message="task 3 get: 1"
... fiber=#5 message="task 1 get: 0"
... fiber=#5 message="task 2 get: 1"
... fiber=#0 message="This counter has a value of 2."
*/
