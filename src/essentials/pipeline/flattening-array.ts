import { pipe, Effect } from "effect"

// $ExpectType Effect<number[], never, never>
pipe(
  Effect.succeed([
    [1, 2],
    [3, 4]
  ]),
  Effect.map((arr) => arr.flat())
)
