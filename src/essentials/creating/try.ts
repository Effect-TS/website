import { Effect } from "effect"

// Effect<never, unknown, any>
const program = Effect.try(
  () => JSON.parse("") // JSON.parse may throw for bad input
)
