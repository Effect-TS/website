import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.flatMap(Effect.sleep("2 seconds"), () =>
  Effect.logDebug("task1 done")
)

// $ExpectType Effect<never, never, void>
const task2 = Effect.flatMap(Effect.sleep("1 seconds"), () =>
  Effect.logDebug("task2 done")
)

// $ExpectType Effect<never, never, void>
export const program = Effect.log("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.log("done"))
)
