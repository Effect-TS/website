import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Effect.log("expense 1200 over 500")

// Run the effect
NodeRuntime.runMain(program)
