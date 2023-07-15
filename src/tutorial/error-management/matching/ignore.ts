import { Effect } from "effect"

// Effect<never, never, void>
const program = Effect.fail("Uh oh!").pipe(Effect.as(5), Effect.ignore)
