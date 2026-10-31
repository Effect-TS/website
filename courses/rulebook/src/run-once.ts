import { NodeRuntime } from "@effect/platform-node"
import { Context, Effect, Layer, Schema } from "effect"
import * as Telemetry from "./Telemetry.ts"

interface Event {
  readonly type: string
  readonly [field: string]: unknown
}

const Rule = Schema.Struct({
  name: Schema.String,
  condition: Schema.optional(Schema.Struct({
    field: Schema.String,
    op: Schema.Literals(["eq", "neq", "gt", "lt"]),
    value: Schema.Number
  })),
  message: Schema.String
})

type Rule = typeof Rule.Type

const decodeRule = Schema.decodeUnknownEffect(Schema.fromJsonString(Rule))

const largeExpense = `{
  "name": "large expense",
  "condition": { "field": "amount", "op": "gt", "value": 500 },
  "message": "over 500"
}`

const malformed = `{
  "name": "malformed",
  "condition": { "field": "amount", "op": "greater", "value": "500" }
}`

const withinBudget = `{
  "name": "within budget",
  "condition": { "field": "amount", "op": "lt", "value": 5000 },
  "message": "under 5000"
}`

const notRefund = `{
  "name": "not a refund",
  "condition": { "field": "amount", "op": "neq", "value": 0 },
  "message": "is not a refund"
}`

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
        ["not a refund", notRefund]
      ])
      return RuleStore.of({ list: Effect.sync(() => Array.from(rules.values())) })
    })
  )
}

class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

const laptop: Event = { type: "expense", amount: 1200 }

const taxi: Event = { type: "expense", description: "taxi" }

// A plain function: it answers a question and does nothing else.
const matches = (rule: Rule, event: Event): boolean => {
  if (rule.condition === undefined) return true
  const { field, op, value } = rule.condition
  const actual = Number(event[field])
  switch (op) {
    case "eq":
      return actual === value
    case "neq":
      return actual !== value
    case "gt":
      return actual > value
    case "lt":
      return actual < value
  }
}

const evaluate = Effect.fn("evaluate")(
  function*(json: string, event: Event) {
    yield* Effect.log(`evaluating a rule for ${event.type}`)
    const rule = yield* decodeRule(json)
    if (rule.condition !== undefined) {
      const { field } = rule.condition
      if (event[field] === undefined) {
        return yield* new MissingField({ field })
      }
    }
    const message = matches(rule, event)
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

// provide is lesson 9, runMain is Part 2
const main = Effect.provide(program, Telemetry.layer)
NodeRuntime.runMain(main)
