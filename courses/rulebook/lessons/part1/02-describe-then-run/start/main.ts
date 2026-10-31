import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Effect.log("expense 1200 over 500")

// runMain is Part 2
NodeRuntime.runMain(program)
