import { Effect } from "effect"
import * as HostPort from "./HostPort"

// Effect<never, ConfigError, void>
export const program = Effect.gen(function* (_) {
  const hostPort = yield* _(Effect.config(HostPort.config))
  console.log(`Application started: ${hostPort.url}`)
})

Effect.runSync(program)
