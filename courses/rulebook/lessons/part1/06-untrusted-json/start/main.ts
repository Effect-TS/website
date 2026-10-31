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

const evaluate = (event: Event) =>
  Effect.gen(function*() {
    if (event.amount === undefined) {
      return yield* new MissingField({ field: "amount" })
    }
    const message = isLarge(event.amount)
      ? `${event.type} ${event.amount} over 500`
      : `${event.type} ${event.amount}: no alert`
    yield* Effect.log(message)
    return message
  }).pipe(
    Effect.catchTag("MissingField", (error) => Effect.log(`skip: missing field ${error.field}`))
  )

const program = Effect.gen(function*() {
  yield* evaluate(laptop)
  yield* evaluate(taxi)
})

// You write this yourself in lesson 11
NodeRuntime.runMain(program)
