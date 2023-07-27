import { Effect, Config } from "effect"

// $ExpectType Effect<never, ConfigError, void>
const program = Effect.flatMap(
  Effect.all([
    Effect.config(Config.string("HOST")),
    Effect.config(Config.number("PORT")),
  ]),
  ([host, port]) =>
    Effect.sync(() => console.log(`Application started: ${host}:${port}`))
)

Effect.runSync(program)
