import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.sleep("2 seconds").pipe(
  Effect.flatMap(() => Effect.log("task1 done", "Debug"))
)

// $ExpectType Effect<never, never, void>
const task2 = Effect.sleep("1 seconds").pipe(
  Effect.flatMap(() => Effect.log("task2 done", "Debug"))
)

// $ExpectType Effect<never, never, void>
export const program = Effect.log("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.log("done"))
)
