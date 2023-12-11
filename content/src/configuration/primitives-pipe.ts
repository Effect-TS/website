import { Effect, Config, Console } from "effect"

// $ExpectType Effect<never, ConfigError, void>
const program = Effect.all([Config.string("HOST"), Config.number("PORT")]).pipe(
  Effect.flatMap(([host, port]) =>
    Console.log(`Application started: ${host}:${port}`)
  )
)

Effect.runSync(program)
