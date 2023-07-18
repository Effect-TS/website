import { Effect, Either } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const successOrFailure = yield* _(
    Effect.either(Effect.fail("Something went wrong!"))
  )
  if (Either.isLeft(successOrFailure)) {
    const error = successOrFailure.left
    return yield* _(Effect.logFatal(String(error)))
  }
  return successOrFailure.right
})

Effect.runPromise(program)
/*
timestamp=... level=FATAL fiber=#0 message="Something went wrong!"
*/
