import { Effect, Either } from "effect"

// $ExpectType Effect<never, string, number>
const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const failureOrSuccess = yield* _(Effect.either(task))
  return yield* _(
    Either.match(failureOrSuccess, {
      onLeft: (error) => Effect.log(`failure: ${error}`),
      onRight: (value) => Effect.log(`success: ${value}`),
    })
  )
})
