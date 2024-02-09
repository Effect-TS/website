import { Effect, Clock, Console } from "effect"

// $ExpectType Effect<void, never, never>
const program = Effect.gen(function* (_) {
  const now = yield* _(Clock.currentTimeMillis)
  yield* _(Console.log(`Application started at ${new Date(now)}`))
})
