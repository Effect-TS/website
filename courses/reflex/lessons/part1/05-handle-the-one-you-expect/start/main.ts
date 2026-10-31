import { NodeRuntime } from "@effect/platform-node"
import { Effect, Schema } from "effect"

interface Event {
  readonly type: string
  readonly amount?: number
}

class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

const taxi: Event = { type: "expense" }

// A plain function: it answers a question and does nothing else.
const isLarge = (amount: number): boolean => amount > 500

const program = Effect.gen(function*() {
  if (taxi.amount === undefined) {
    return yield* new MissingField({ field: "amount" })
  }
  const message = isLarge(taxi.amount)
    ? `${taxi.type} ${taxi.amount} over 500`
    : `${taxi.type} ${taxi.amount}: no alert`
  yield* Effect.log(message)
  return message
})

// Run the effect
NodeRuntime.runMain(program)
