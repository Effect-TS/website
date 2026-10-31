import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const message = "expense 1200 over 500"

const alert = Effect.as(Effect.log(message), message)

const program = Effect.andThen(alert, alert)

// You write this yourself in lesson 11
NodeRuntime.runMain(program)
