import { Effect, Option } from "effect"
import { Random } from "./service"

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  const maybeRandom = yield* _(Effect.serviceOption(Random))
  const randomNumber = Option.isNone(maybeRandom)
    ? // the service is not available, return a default value
      yield* _(Effect.succeed(-1))
    : // the service is available
      yield* _(maybeRandom.value.next())
  return yield* _(Effect.log(`${randomNumber}`))
})
