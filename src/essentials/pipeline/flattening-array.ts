import { pipe, Effect } from "effect"

// $ExpectType Effect<never, never, number[]>
pipe(
  Effect.succeed([[1,2],[3,4]]),
  Effect.map((arr) => arr.flat())
)
