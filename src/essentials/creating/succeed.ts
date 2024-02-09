import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
const program = Effect.succeed(42)
