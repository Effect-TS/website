import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const amount: number = 1200

// A plain function: it answers a question and does nothing else.
const isLarge = (amount: number): boolean => amount > 500

const program = Effect.gen(function*() {
  const message = isLarge(amount) ? `expense ${amount} over 500` : `expense ${amount}: no alert`
  yield* Effect.log(message)
  return message
})

// Run the effect
NodeRuntime.runMain(program)
