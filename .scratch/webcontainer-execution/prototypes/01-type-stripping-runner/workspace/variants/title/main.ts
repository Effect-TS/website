import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
console.log("process.title =", JSON.stringify(process.title))
NodeRuntime.runMain(Effect.log("runMain ok"))
