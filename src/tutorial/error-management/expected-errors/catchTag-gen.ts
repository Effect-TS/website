import { Effect, Either } from "effect"
import { program } from "./error-accumulation-gen"

// Effect<never, BarError, string>
const recovered = Effect.gen(function* (_) {
  const successOrFailure = yield* _(Effect.either(program))
  if (Either.isLeft(successOrFailure)) {
    const error = successOrFailure.left
    if (error._tag === "FooError") {
      return "Recovering from FooError"
    }
    return yield* _(Effect.fail(error))
  }
  return successOrFailure.right
})
