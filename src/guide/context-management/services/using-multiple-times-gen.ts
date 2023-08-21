import { Effect, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const randomNumber = yield* _(random.next)
  yield* _(Console.log(`random number: ${randomNumber}`))
  const anotherRandomNumber = yield* _(random.next)
  return yield* _(Console.log(`another random number: ${anotherRandomNumber}`))
})

// $ExpectType Effect<never, never, void>
const runnable = Effect.provideService(
  program,
  Random,
  Random.of({
    next: Effect.sync(() => Math.random())
  })
)

Effect.runSync(runnable)
/*
Output:
random number: 0.8241872233134417
another random number: 0.8241872233134417
*/
