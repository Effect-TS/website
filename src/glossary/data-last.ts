import { Effect, pipe } from "effect"

pipe(
  Effect.succeed(1),
  Effect.map((n) => n + 1)
)

// or

Effect.succeed(1).pipe(Effect.map((n) => n + 1))
