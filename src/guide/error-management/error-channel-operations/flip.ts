import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, number, string>
const flipped = Effect.flip(task)
