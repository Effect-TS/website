import { Effect } from "effect"
import { Random } from "./service"

// $ExpectType Effect<void, never, Random>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const randomNumber = yield* _(random.next)
  console.log(`random number: ${randomNumber}`)
})
