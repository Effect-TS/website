import { Effect } from "effect"
import * as HostPort from "./HostPort"

// $ExpectType Effect<void, ConfigError, never>
export const program = Effect.gen(function* (_) {
  const hostPort = yield* _(HostPort.config)
  console.log(`Application started: ${hostPort.url}`)
})
