import { Effect } from "effect"

const task1 = Effect.sleep("2 seconds").pipe(
  Effect.flatMap(() => Effect.logDebug("task1 done"))
)

const task2 = Effect.sleep("1 seconds").pipe(
  Effect.flatMap(() => Effect.logDebug("task2 done"))
)

export const program = Effect.log("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.log("done"))
)
