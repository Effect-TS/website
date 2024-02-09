import { Effect, Either } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<string, never, never>
const recovered = Effect.gen(function* (_) {
  // $ExpectType Either<FooError | BarError, string>
  const failureOrSuccess = yield* _(Effect.either(program))
  if (Either.isLeft(failureOrSuccess)) {
    // failure case: you can extract the error from the `left` property
    const error = failureOrSuccess.left
    return `Recovering from ${error._tag}`
  } else {
    // success case: you can extract the value from the `right` property
    return failureOrSuccess.right
  }
})
