import { Effect, pipe } from "effect"

pipe(
  Effect.succeed(1),
  Effect.map((n) => n + 1)
)
