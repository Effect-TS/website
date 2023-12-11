import { Effect, Console } from "effect"

// $ExpectType Effect<never, string, number>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  // $ExpectType Cause<string>
  const cause = yield* _(Effect.cause(simulatedTask))
  yield* _(Console.log(cause))
})
