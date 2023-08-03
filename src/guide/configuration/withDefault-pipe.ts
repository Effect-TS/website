import { Effect, Config } from "effect"

const program = Effect.all([
  Effect.config(Config.string("HOST")),
  Effect.config(Config.withDefault(Config.number("PORT"), 8080))
]).pipe(
  Effect.flatMap(([host, port]) =>
    Effect.sync(() => console.log(`Application started: ${host}:${port}`))
  )
)

Effect.runSync(program)
