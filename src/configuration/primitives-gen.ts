import { Effect, Config } from "effect"

// $ExpectType Effect<void, ConfigError, never>
const program = Effect.gen(function* (_) {
  const host = yield* _(Config.string("HOST"))
  const port = yield* _(Config.string("PORT"))
  console.log(`Application started: ${host}:${port}`)
})

Effect.runSync(program)
