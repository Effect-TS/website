import { Effect } from "effect"

// $ExpectType Effect<any, UnknownException, never>
const program = Effect.try(
  () => JSON.parse("") // JSON.parse may throw for bad input
)
