import { Effect, Either } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<string, never, never>
const recovered = Effect.gen(function* (_) {
  const failureOrSuccess = yield* _(Effect.either(program))
  if (Either.isLeft(failureOrSuccess)) {
    const error = failureOrSuccess.left
    if (error._tag === "FooError") {
      return "Recovering from FooError"
    } else {
      return "Recovering from BarError"
    }
  } else {
    return failureOrSuccess.right
  }
})
