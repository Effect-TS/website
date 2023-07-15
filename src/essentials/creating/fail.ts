import { Effect } from "effect"

// Effect<never, string, never>
const program = Effect.fail("my error")
