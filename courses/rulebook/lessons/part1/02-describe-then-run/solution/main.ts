import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const alert = Effect.log("expense 1200 over 500")

const program = Effect.andThen(alert, alert)

// You write this yourself in lesson 11
NodeRuntime.runMain(program)
