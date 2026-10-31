import { NodeRuntime } from "@effect/platform-node"
import { Effect, Schema } from "effect"
import * as Telemetry from "../../Telemetry.ts"

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

class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

const laptop: Event = { type: "expense", amount: 1200 }

const taxi: Event = { type: "expense", description: "taxi" }

const largeExpense = `{
  "name": "large expense",
  "condition": { "field": "amount", "op": "gt", "value": 500 },
  "message": "over 500"
}`

const malformed = `{
  "name": "malformed",
  "condition": { "field": "amount", "op": "greater", "value": "500" }
}`

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

const evaluate = (json: string, event: Event) =>
  Effect.gen(function*() {
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
  }).pipe(
    Effect.catchTag("MissingField", (error) => Effect.log(`skip: missing field ${error.field}`))
  )

const program = Effect.gen(function*() {
  yield* evaluate(largeExpense, laptop)
  yield* evaluate(largeExpense, taxi)
  yield* evaluate(malformed, laptop)
})

// provide is lesson 9, runMain is Part 2
const main = Effect.provide(program, Telemetry.layer)
NodeRuntime.runMain(main)
