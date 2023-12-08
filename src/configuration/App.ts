import { Effect, Console } from "effect"
import * as HostPort from "./HostPort"

// $ExpectType Effect<never, ConfigError, void>
export const program = Effect.config(HostPort.config).pipe(
  Effect.flatMap((hostPort) =>
    Console.log(`Application started: ${hostPort.url}`)
  )
)
