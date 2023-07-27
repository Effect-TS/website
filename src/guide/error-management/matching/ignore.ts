import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const myeffect = Effect.fail("Uh oh!").pipe(Effect.as(5))

// $ExpectType Effect<never, never, void>
const program = Effect.ignore(myeffect)
