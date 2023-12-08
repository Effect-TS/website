import { Effect, Config, Console } from "effect"

// $ExpectType Effect<never, ConfigError, void>
const program = Effect.all([
  Effect.config(Config.string("HOST")),
  Effect.config(Config.number("PORT"))
]).pipe(
  Effect.flatMap(([host, port]) =>
    Console.log(`Application started: ${host}:${port}`)
  )
)

Effect.runSync(program)
