import { Effect, Either } from "effect"

// Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const successOrFailure = yield* _(
    Effect.either(Effect.fail("Something went wrong!"))
  )
  if (Either.isLeft(successOrFailure)) {
    const error = successOrFailure.left
    yield* _(Effect.log(String(error), { level: "Error" }))
    return undefined
  }
  return successOrFailure.right
})

Effect.runPromise(program)
/*
timestamp=... level=ERROR fiber=#0 message="Something went wrong!"
*/
