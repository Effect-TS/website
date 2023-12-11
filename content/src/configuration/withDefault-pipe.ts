import { Effect, Config, Console } from "effect"

const program = Effect.all([
  Config.string("HOST"),
  Config.withDefault(Config.number("PORT"), 8080)
]).pipe(
  Effect.flatMap(([host, port]) =>
    Console.log(`Application started: ${host}:${port}`)
  )
)

Effect.runSync(program)
