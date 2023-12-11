import { Effect } from "effect"

// $ExpectType Effect<never, UnknownException, any>
const program = Effect.try(
  () => JSON.parse("") // JSON.parse may throw for bad input
)
