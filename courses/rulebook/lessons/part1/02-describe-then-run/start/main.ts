import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import * as Telemetry from "../../Telemetry.ts"

const program = Effect.log("expense 1200 over 500")

// provide is lesson 9, runMain is Part 2
const main = Effect.provide(program, Telemetry.layer)
NodeRuntime.runMain(main)
