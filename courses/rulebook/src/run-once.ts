import { NodeRuntime } from "@effect/platform-node"
import { Context, Effect, Layer, Schema } from "effect"

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

const largeExpense = `{ "name": "large expense", "op": "gt", "value": 500, "message": "over 500" }`

const malformed = `{ "name": "malformed", "op": "greater", "value": "500" }`

const withinBudget = `{ "name": "within budget", "op": "lt", "value": 5000, "message": "under 5000" }`

const veryLarge = `{ "name": "very large", "op": "gt", "value": 1000, "message": "over 1000" }`

class RuleStore extends Context.Service<RuleStore, {
  readonly list: Effect.Effect<ReadonlyArray<string>>
}>()("rulebook/RuleStore") {
  static readonly layer = Layer.effect(
    RuleStore,
    Effect.sync(() => {
      const rules = new Map([["large expense", largeExpense], ["malformed", malformed]])
      return RuleStore.of({ list: Effect.sync(() => Array.from(rules.values())) })
    })
  )

  static readonly layerFixtures = Layer.effect(
    RuleStore,
    Effect.sync(() => {
      const rules = new Map([
        ["large expense", largeExpense],
        ["within budget", withinBudget],
        ["very large", veryLarge]
      ])
      return RuleStore.of({ list: Effect.sync(() => Array.from(rules.values())) })
    })
  )
}

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
}).pipe(Effect.provide(RuleStore.layerFixtures))

// You write this yourself in lesson 11
NodeRuntime.runMain(program)
