import { NodeRuntime } from "@effect/platform-node"
import { Effect, Schema } from "effect"
import * as Telemetry from "../../Telemetry.ts"

interface Event {
  readonly type: string
  readonly [field: string]: unknown
}

interface Rule {
  readonly name: string
  readonly condition?: { readonly field: string; readonly op: string; readonly value: number }
  readonly message: string
}

class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

class UnknownOperator extends Schema.TaggedError<UnknownOperator>()("UnknownOperator", {
  op: Schema.String
}) {}

const operators = ["eq", "neq", "gt", "lt"]

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
    default:
      return false
  }
}

const evaluate = (json: string, event: Event) =>
  Effect.gen(function*() {
    const rule: Rule = JSON.parse(json)
    if (rule.condition !== undefined) {
      const { field, op } = rule.condition
      if (event[field] === undefined) {
        return yield* new MissingField({ field })
      }
      if (!operators.includes(op)) {
        return yield* new UnknownOperator({ op })
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
