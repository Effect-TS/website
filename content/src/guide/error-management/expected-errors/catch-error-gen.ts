import { Effect, Either } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<never, BarError, string>
const recovered = Effect.gen(function* (_) {
  const failureOrSuccess = yield* _(Effect.either(program))
  if (Either.isLeft(failureOrSuccess)) {
    const error = failureOrSuccess.left
    if (error._tag === "FooError") {
      return "Recovering from FooError"
    }
    return yield* _(Effect.fail(error))
  } else {
    return failureOrSuccess.right
  }
})
