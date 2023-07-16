import { Effect } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const randomNumber = yield* _(random.next())
  return yield* _(Effect.log(`${randomNumber}`))
})
