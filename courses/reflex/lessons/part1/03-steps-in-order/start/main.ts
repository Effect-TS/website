import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const alert = Effect.log("expense 1200 over 500")

const program = Effect.andThen(alert, alert)

// Run the effect
NodeRuntime.runMain(program)
