import { Effect, Either } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<never, never, string>
const recovered = Effect.gen(function* (_) {
  // $ExpectType Either<FooError | BarError, string>
  const failureOrSuccess = yield* _(Effect.either(program))
  if (Either.isLeft(failureOrSuccess)) {
    // failure case
    const error = failureOrSuccess.left
    return `Recovering from ${error._tag}`
  } else {
    // success case
    return failureOrSuccess.right
  }
})
