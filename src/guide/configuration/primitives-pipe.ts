import { Effect, Config } from "effect"

// $ExpectType Effect<never, ConfigError, void>
const program = Effect.all([
  Effect.config(Config.string("HOST")),
  Effect.config(Config.number("PORT")),
]).pipe(
  Effect.flatMap(([host, port]) =>
    Effect.sync(() => console.log(`Application started: ${host}:${port}`))
  )
)

Effect.runSync(program)
