import { Effect } from "effect"

// $ExpectType Effect<number, string, never>
const task = Effect.fail("Uh oh!").pipe(Effect.as(5))

// $ExpectType Effect<void, never, never>
const program = Effect.ignore(task)
