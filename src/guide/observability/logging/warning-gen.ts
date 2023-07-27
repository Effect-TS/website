import { Effect, Either } from "effect"

const myeffect = Effect.asUnit(Effect.fail("Something went wrong!"))

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const failureOrSuccess = yield* _(Effect.either(myeffect))
  return yield* _(
    Either.match(failureOrSuccess, {
      onLeft: (error) => Effect.logWarning(String(error)),
      onRight: (value) => Effect.succeed(value),
    })
  )
})

Effect.runPromise(program)
/*
timestamp=... level=WARN fiber=#0 message="Something went wrong!"
*/
