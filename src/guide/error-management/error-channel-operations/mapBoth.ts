import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const program = Effect.fail("Oh no!").pipe(Effect.as(1))

// $ExpectType Effect<never, Error, boolean>
const modified = program.pipe(
  Effect.mapBoth({
    onFailure: (message) => new Error(message),
    onSuccess: (n) => n > 0,
  })
)
