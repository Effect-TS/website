import { Effect } from "effect"
import { Random } from "./service"

// $ExpectType Effect<void, never, Random>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const randomNumber = yield* _(random.next)
  console.log(`random number: ${randomNumber}`)
  const anotherRandomNumber = yield* _(random.next)
  console.log(`another random number: ${anotherRandomNumber}`)
})

// $ExpectType Effect<void, never, never>
const runnable = Effect.provideService(program, Random, {
  next: Effect.sync(() => Math.random())
})

Effect.runPromise(runnable).then(console.log)
/*
Output:
random number: 0.8241872233134417
another random number: 0.8241872233134417
*/
