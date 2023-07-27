import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const program = Effect.fail("Oh no!").pipe(Effect.as(1))

// $ExpectType Effect<never, Error, number>
const modified = Effect.mapError(program, (message) => new Error(message))
