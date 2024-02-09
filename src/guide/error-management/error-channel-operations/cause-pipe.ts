import { Effect, Console } from "effect"

// $ExpectType Effect<number, string, never>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<void, never, never>
const program = Effect.cause(simulatedTask).pipe(
  Effect.flatMap(
    (
      cause // $ExpectType Cause<string>
    ) => Console.log(cause)
  )
)
