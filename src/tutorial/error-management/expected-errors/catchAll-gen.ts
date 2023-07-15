import { Effect, Either } from "effect"
import { program } from "./error-accumulation-gen"

// Effect<never, never, string>
const recovered = Effect.gen(function* (_) {
  const successOrFailure = yield* _(Effect.either(program))
  if (Either.isLeft(successOrFailure)) {
    const error = successOrFailure.left
    return `Recovering from ${error._tag}`
  }
  return successOrFailure.right
})
