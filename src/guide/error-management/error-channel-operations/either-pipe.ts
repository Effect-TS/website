import { Effect, Either } from "effect"

// $ExpectType Effect<never, string, number>
const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, Either<string, number>>
const lifted = Effect.either(task)

// $ExpectType Effect<never, never, void>
const program = lifted.pipe(
  Effect.flatMap((failureOrSuccess) =>
    Either.match(failureOrSuccess, {
      onLeft: (error) => Effect.log(`failure: ${error}`),
      onRight: (value) => Effect.log(`success: ${value}`),
    })
  )
)
