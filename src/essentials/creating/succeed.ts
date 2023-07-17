import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
const program = Effect.succeed(42)
