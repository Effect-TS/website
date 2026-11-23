import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import { DevToolsLayer } from "./DevTools.js"

const program = Effect.gen(function* () {
  yield* Effect.log("Welcome to the Effect v4 Playground!")
}).pipe(
  Effect.withSpan("program", {
    attributes: { source: "Playground" },
  }),
)

NodeRuntime.runMain(program.pipe(Effect.provide(DevToolsLayer)))
