import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"

interface User {
  readonly id: number
}

const load = (id: number): Effect.Effect<User> =>
  Effect.sync((): User => {
    throw new Error("effect boom at line 8")
  })

NodeRuntime.runMain(
  Effect.gen(function* () {
    yield* Effect.log("starting")
    yield* load(1)
  }),
)
