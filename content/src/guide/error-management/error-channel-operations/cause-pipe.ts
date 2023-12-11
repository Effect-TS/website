import { Effect, Console } from "effect"

// $ExpectType Effect<never, string, number>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, void>
const program = Effect.cause(simulatedTask).pipe(
  Effect.flatMap(
    (
      cause // $ExpectType Cause<string>
    ) => Console.log(cause)
  )
)
