import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.sleep("2 seconds")

// $ExpectType Effect<never, never, void>
const task2 = Effect.sleep("1 seconds")

// $ExpectType Effect<never, never, void>
const program = Effect.logInfo("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.logInfo("done"))
)

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 3 seconds ...
...more infos... level=INFO message=done
*/
