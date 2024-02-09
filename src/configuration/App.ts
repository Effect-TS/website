import { Effect, Console } from "effect"
import * as HostPort from "./HostPort"

// $ExpectType Effect<void, ConfigError, never>
export const program = HostPort.config.pipe(
  Effect.flatMap((hostPort) =>
    Console.log(`Application started: ${hostPort.url}`)
  )
)
