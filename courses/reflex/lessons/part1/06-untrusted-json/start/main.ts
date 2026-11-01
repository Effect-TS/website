import { NodeRuntime } from "@effect/platform-node"
import { Effect, Schema } from "effect"

interface Event {
  readonly type: string
  readonly amount?: number
}

class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

const laptop: Event = { type: "expense", amount: 1200 }

const taxi: Event = { type: "expense" }

// A plain function: it answers a question and does nothing else.
const isLarge = (amount: number): boolean => amount > 500

// Logs the verdict for one expense and reports whether it was flagged.
const evaluate = (event: Event) =>
  Effect.gen(function*() {
    if (event.amount === undefined) {
      return yield* new MissingField({ field: "amount" })
    }
    const flagged = isLarge(event.amount)
    yield* Effect.log(
      flagged ? `${event.type} ${event.amount} over 500` : `${event.type} ${event.amount}: no alert`
    )
    return flagged
  }).pipe(
    Effect.catchTag("MissingField", (error) => Effect.as(Effect.log(`skip: missing field ${error.field}`), false))
  )

const program = Effect.gen(function*() {
  const laptopFlagged = yield* evaluate(laptop)
  const taxiFlagged = yield* evaluate(taxi)
  const flagged = [laptopFlagged, taxiFlagged].filter(Boolean).length
  yield* Effect.log(`${flagged} of 2 expenses flagged`)
})

// Run the effect
NodeRuntime.runMain(program)
