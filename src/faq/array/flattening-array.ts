import { pipe, Effect } from "effect"

// Effect.Effect<never, never, Array<number>>
pipe(
  Effect.succeed([[1,2],[3,4]]),
  Effect.map((arr) => arr.flat())
)
