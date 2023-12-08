import { Effect, Config } from "effect"

const program = Effect.gen(function* (_) {
  const host = yield* _(Effect.config(Config.string("HOST")))
  const port = yield* _(
    Effect.config(Config.withDefault(Config.number("PORT"), 8080))
  )
  console.log(`Application started: ${host}:${port}`)
})

Effect.runSync(program)
