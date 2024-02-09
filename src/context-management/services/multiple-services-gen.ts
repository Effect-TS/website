import { Effect, Context } from "effect"

class Random extends Context.Tag("Random")<
  Random,
  {
    readonly next: Effect.Effect<number>
  }
>() {}

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {}

// $ExpectType Effect<Random | Logger, never, void>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const logger = yield* _(Logger)
  const randomNumber = yield* _(random.next)
  return yield* _(logger.log(String(randomNumber)))
})
