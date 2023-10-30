import { Effect } from "effect"

// $ExpectType Effect<never, string, never>
export const failure = Effect.fail("Uh oh!")
