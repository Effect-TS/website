import { Effect, Either, Console } from "effect"

// $ExpectType Effect<number, string, never>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<number, never, never>
const program = Effect.either(simulatedTask).pipe(
  Effect.flatMap(
    (
      failureOrSuccess // $ExpectType Either<string, number>
    ) =>
      Either.match(failureOrSuccess, {
        onLeft: (error) => Console.log(`failure: ${error}`).pipe(Effect.as(0)),
        onRight: (value) =>
          Console.log(`success: ${value}`).pipe(Effect.as(value))
      })
  )
)
