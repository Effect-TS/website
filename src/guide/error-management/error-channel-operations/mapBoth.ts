import { Effect } from "effect"

// $ExpectType Effect<number, string, never>
const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))

// $ExpectType Effect<boolean, Error, never>
const modified = Effect.mapBoth(simulatedTask, {
  onFailure: (message) => new Error(message),
  onSuccess: (n) => n > 0
})
