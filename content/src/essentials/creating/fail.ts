import { Effect } from "effect"

// $ExpectType Effect<never, string, never>
const program = Effect.fail("my error")
