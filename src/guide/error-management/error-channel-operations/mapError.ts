import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))

// $ExpectType Effect<never, Error, number>
const mapped = Effect.mapError(simulatedTask, (message) => new Error(message))
