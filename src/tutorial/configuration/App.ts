import { Effect } from "effect"
import * as HostPort from "./HostPort"

// $ExpectType Effect<never, ConfigError, void>
export const program = Effect.config(HostPort.config).pipe(
  Effect.flatMap((hostPort) =>
    Effect.sync(() => console.log(`Application started: ${hostPort.url}`))
  )
)

Effect.runSync(program)
