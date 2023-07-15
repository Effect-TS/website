import { Effect } from "effect"

// Effect<never, never, void>
const task1 = Effect.sleep("2 seconds")

// Effect<never, never, void>
const task2 = Effect.sleep("1 seconds")

// Effect<never, never, void>
const program = Effect.log("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.log("done"))
)

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 3 seconds ...
...more infos... level=INFO message=done
*/
