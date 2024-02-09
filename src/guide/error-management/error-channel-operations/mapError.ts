import { Effect } from "effect"

// $ExpectType Effect<number, string, never>
const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))

// $ExpectType Effect<number, Error, never>
const mapped = Effect.mapError(simulatedTask, (message) => new Error(message))
