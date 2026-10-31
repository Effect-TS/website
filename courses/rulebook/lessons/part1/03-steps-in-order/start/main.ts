import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
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

const laptop: Event = { type: "expense", amount: 1200 }

const largeExpense: Rule = {
  name: "large expense",
  condition: { field: "amount", op: "gt", value: 500 },
  message: "over 500"
}

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

const message = matches(largeExpense, laptop)
  ? `${laptop.type} ${laptop.amount} ${largeExpense.message}`
  : `${largeExpense.name}: no alert`

const program = Effect.as(Effect.log(message), message)

// provide is lesson 9, runMain is Part 2
const main = Effect.provide(program, Telemetry.layer)
NodeRuntime.runMain(main)
