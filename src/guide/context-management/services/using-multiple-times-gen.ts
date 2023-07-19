import { Effect } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const randomNumber = yield* _(random.next())
  yield* _(Effect.log(`random number: ${randomNumber}`))
  const anotherRandomNumber = yield* _(random.next())
  return yield* _(Effect.log(`another random number: ${anotherRandomNumber}`))
})

// $ExpectType Effect<never, never, void>
const runnable = Effect.provideService(
  program,
  Random,
  Random.of({
    next: () => Effect.succeed(Math.random()),
  })
)

Effect.runSync(runnable)
/*
..more infos... message="random number: 0.8241872233134417"
..more infos... message="another random number: 0.8241872233134417"
*/
