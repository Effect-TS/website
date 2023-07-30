import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
export const success = Effect.succeed(2)
