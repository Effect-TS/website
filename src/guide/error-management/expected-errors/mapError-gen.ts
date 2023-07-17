import { Effect, Either } from "effect"
import { program } from "./error-accumulation-gen"

// $ExpectType Effect<never, Error, string>
const modified = Effect.gen(function* (_) {
  const successOrFailure = yield* _(Effect.either(program))
  if (Either.isLeft(successOrFailure)) {
    const error = successOrFailure.left
    switch (error._tag) {
      case "FooError":
        return yield* _(Effect.fail(new Error("Something went wrong with Foo")))
      case "BarError":
        return yield* _(Effect.fail(new Error("Something went wrong with Bar")))
    }
  }
  return successOrFailure.right
})
