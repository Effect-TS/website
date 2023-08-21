import { Effect, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const randomNumber = yield* _(random.next)
  return yield* _(Console.log(`random number: ${randomNumber}`))
})
