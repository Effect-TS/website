import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))

// $ExpectType Effect<never, Error, boolean>
const modified = Effect.mapBoth(simulatedTask, {
  onFailure: (message) => new Error(message),
  onSuccess: (n) => n > 0
})
