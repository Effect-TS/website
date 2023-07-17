import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.fail("Uh oh!").pipe(Effect.as(5), Effect.ignore)
