import { Effect, Config } from "effect"

// Effect<never, ConfigError, void>
const program = Effect.gen(function* (_) {
  const host = yield* _(Effect.config(Config.string("HOST")))
  const port = yield* _(Effect.config(Config.string("PORT")))
  console.log(`Application started: ${host}:${port}`)
})

Effect.runSync(program)
