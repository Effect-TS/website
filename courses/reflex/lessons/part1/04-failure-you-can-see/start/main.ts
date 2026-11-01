import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

// A plain function: it answers a question and does nothing else.
const isLarge = (amount: number): boolean => amount > 500

// Logs the verdict for one expense and reports whether it was flagged.
const evaluate = (amount: number) =>
  Effect.gen(function*() {
    const flagged = isLarge(amount)
    yield* Effect.log(flagged ? `expense ${amount} over 500` : `expense ${amount}: no alert`)
    return flagged
  })

const program = Effect.gen(function*() {
  const laptop = yield* evaluate(1200)
  const lunch = yield* evaluate(40)
  const flagged = [laptop, lunch].filter(Boolean).length
  yield* Effect.log(`${flagged} of 2 expenses flagged`)
})

// Run the effect
NodeRuntime.runMain(program)
