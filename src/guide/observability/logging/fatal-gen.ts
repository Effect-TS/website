import { Effect, Either } from "effect"

const task = Effect.asUnit(Effect.fail("Something went wrong!"))

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const failureOrSuccess = yield* _(Effect.either(task))
  return yield* _(
    Either.match(failureOrSuccess, {
      onLeft: (error) => Effect.logFatal(String(error)),
      onRight: (value) => Effect.succeed(value),
    })
  )
})

Effect.runPromise(program)
/*
timestamp=... level=FATAL fiber=#0 message="Something went wrong!"
*/
