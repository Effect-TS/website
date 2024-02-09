import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
export const success = Effect.succeed(2)
