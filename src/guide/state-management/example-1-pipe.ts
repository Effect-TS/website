import { Effect, Console } from "effect"
import * as Counter from "./Counter"

// $ExpectType Effect<never, never, void>
const program = Counter.make.pipe(
  Effect.flatMap((counter) =>
    counter.inc.pipe(
      Effect.flatMap(() => counter.inc),
      Effect.flatMap(() => counter.dec),
      Effect.flatMap(() => counter.inc),
      Effect.flatMap(() => counter.get),
      Effect.flatMap((value) =>
        Console.log(`This counter has a value of ${value}.`)
      )
    )
  )
)

Effect.runSync(program)
/*
This counter has a value of 2.
*/
