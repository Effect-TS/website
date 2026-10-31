import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Effect.log("expense 1200 over 500")

// You write this yourself in lesson 11
NodeRuntime.runMain(program)
