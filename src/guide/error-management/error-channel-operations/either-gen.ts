import { Effect, Either } from "effect"

// $ExpectType Effect<never, string, number>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, number>
const program = Effect.gen(function* (_) {
  // $ExpectType Either<string, number>
  const failureOrSuccess = yield* _(Effect.either(simulatedTask))
  if (Either.isLeft(failureOrSuccess)) {
    const error = failureOrSuccess.left
    yield* _(Effect.log(`failure: ${error}`))
    return 0
  } else {
    const value = failureOrSuccess.right
    yield* _(Effect.log(`success: ${value}`))
    return value
  }
})
