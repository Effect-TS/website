import { Effect, Either } from "effect"
import { program } from "./error-accumulation"

// $ExpectType Effect<never, never, string>
const recovered = Effect.gen(function* (_) {
  const successOrFailure = yield* _(Effect.either(program))
  if (Either.isLeft(successOrFailure)) {
    const error = successOrFailure.left
    switch (error._tag) {
      case "FooError":
        return "Recovering from FooError"
      case "BarError":
        return "Recovering from BarError"
    }
  }
  return successOrFailure.right
})
