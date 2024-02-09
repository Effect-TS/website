import { Effect, Either, Console } from "effect"

// $ExpectType Effect<number, string, never>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<number, never, never>
const program = Effect.gen(function* (_) {
  // $ExpectType Either<string, number>
  const failureOrSuccess = yield* _(Effect.either(simulatedTask))
  if (Either.isLeft(failureOrSuccess)) {
    const error = failureOrSuccess.left
    yield* _(Console.log(`failure: ${error}`))
    return 0
  } else {
    const value = failureOrSuccess.right
    yield* _(Console.log(`success: ${value}`))
    return value
  }
})
