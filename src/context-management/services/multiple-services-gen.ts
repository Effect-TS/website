import { Effect, Context } from "effect"

interface Random {
  readonly next: Effect.Effect<never, never, number>
}

const Random = Context.Tag<Random>()

interface Logger {
  readonly log: (message: string) => Effect.Effect<never, never, void>
}

const Logger = Context.Tag<Logger>()

// $ExpectType Effect<Random | Logger, never, void>
const program = Effect.gen(function* (_) {
  const random = yield* _(Random)
  const logger = yield* _(Logger)
  const randomNumber = yield* _(random.next)
  return yield* _(logger.log(String(randomNumber)))
})
