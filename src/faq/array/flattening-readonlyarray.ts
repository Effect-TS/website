import { pipe, Effect, ReadonlyArray } from "effect"

// Effect.Effect<never, never, ReadonlyArray<number>>
pipe(
  Effect.succeed([[1,2],[3,4]]),
  Effect.map(ReadonlyArray.flatten)
)
