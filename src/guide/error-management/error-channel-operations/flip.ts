import { Effect } from "effect"

// $ExpectType Effect<number, string, never>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<string, number, never>
const flipped = Effect.flip(simulatedTask)
