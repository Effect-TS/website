import { NodeRuntime } from "@effect/platform-node"
import { Context, Effect, Schema } from "effect"

interface Event {
  readonly type: string
  readonly amount?: number
}

const Rule = Schema.Struct({
  name: Schema.String,
  op: Schema.Literals(["gt", "lt"]),
  value: Schema.Number,
  message: Schema.String
})

type Rule = typeof Rule.Type

const decodeRule = Schema.decodeUnknownEffect(Schema.fromJsonString(Rule))

class RuleStore extends Context.Service<RuleStore, {
  readonly list: Effect.Effect<ReadonlyArray<string>>
}>()("rulebook/RuleStore") {}

class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

const laptop: Event = { type: "expense", amount: 1200 }

const taxi: Event = { type: "expense" }

// A plain function: it answers a question and does nothing else.
const matches = (rule: Rule, amount: number): boolean => {
  switch (rule.op) {
    case "gt":
      return amount > rule.value
    case "lt":
      return amount < rule.value
  }
}

const evaluate = Effect.fn("evaluate")(
  function*(json: string, event: Event) {
    const rule = yield* decodeRule(json)
    if (event.amount === undefined) {
      return yield* new MissingField({ field: "amount" })
    }
    const message = matches(rule, event.amount)
      ? `${event.type} ${event.amount} ${rule.message}`
      : `${rule.name}: no alert`
    yield* Effect.log(message)
    return message
  },
  Effect.catchTag("MissingField", (error) => Effect.log(`skip: missing field ${error.field}`))
)

const evaluateAll = Effect.fn("evaluateAll")(function*(event: Event) {
  const store = yield* RuleStore
  for (const json of yield* store.list) {
    yield* evaluate(json, event)
  }
})

const program = Effect.gen(function*() {
  yield* evaluateAll(laptop)
  yield* evaluateAll(taxi)
})

// Run the effect
NodeRuntime.runMain(program)
