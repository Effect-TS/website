import { Effect, Predicate, Schema } from "effect"

// A rule is one trigger, at most one condition and one action. Each of the
// unions below is tagged by its `type` field, so a decoded rule can be
// narrowed with an ordinary `switch`.

export const EventTrigger = Schema.Struct({
  type: Schema.Literal("event"),
  event: Schema.String
})

// Polling more often than every 5 seconds is refused when the rule is decoded,
// so no stored rule can hammer the URL it polls.
export const IntervalTrigger = Schema.Struct({
  type: Schema.Literal("interval"),
  everySeconds: Schema.Int.check(Schema.isGreaterThanOrEqualTo(5)),
  url: Schema.String
})

export const Trigger = Schema.Union([EventTrigger, IntervalTrigger])

export const Operator = Schema.Literals(["eq", "neq", "gt", "lt", "contains"])

export const Condition = Schema.Struct({
  field: Schema.String,
  op: Operator,
  value: Schema.Union([Schema.String, Schema.Number, Schema.Boolean])
})

export const AppendFile = Schema.Struct({
  type: Schema.Literal("appendFile"),
  path: Schema.String,
  message: Schema.String
})

export const HttpPost = Schema.Struct({
  type: Schema.Literal("httpPost"),
  url: Schema.String,
  message: Schema.String,
  headers: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  includePayload: Schema.optionalKey(Schema.Boolean)
})

export const Action = Schema.Union([AppendFile, HttpPost])

export const Rule = Schema.Struct({
  name: Schema.String,
  trigger: Trigger,
  condition: Schema.optionalKey(Condition),
  action: Action
})
export type Rule = typeof Rule.Type

// An event is a JSON object with a `type`; every other field is payload.
export const Event = Schema.StructWithRest(Schema.Struct({ type: Schema.String }), [
  Schema.Record(Schema.String, Schema.Unknown)
])
export type Event = typeof Event.Type

// What a condition is evaluated against: an event, or for an interval rule
// the `{ status, body }` of the poll.
export type Payload = { readonly [key: string]: unknown }

export class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {
  field: Schema.String
}) {}

// Reads a dotted path such as `body.status` from the payload.
export const lookup = Effect.fn("lookup")(function*(payload: Payload, field: string) {
  let value: unknown = payload
  for (const key of field.split(".")) {
    if (!Predicate.isObject(value) || !(key in value)) {
      return yield* new MissingField({ field })
    }
    value = value[key]
  }
  return value
})

const compare = (actual: unknown, op: typeof Operator.Type, expected: string | number | boolean) => {
  switch (op) {
    case "eq":
      return actual === expected
    case "neq":
      return actual !== expected
    case "gt":
      return Predicate.isNumber(actual) && Predicate.isNumber(expected) && actual > expected
    case "lt":
      return Predicate.isNumber(actual) && Predicate.isNumber(expected) && actual < expected
    case "contains":
      if (Predicate.isString(actual)) return actual.includes(String(expected))
      return Array.isArray(actual) && actual.includes(expected)
  }
}

// True when the rule should act on the payload. No condition means always.
export const evaluate = Effect.fn("evaluate")(function*(rule: Rule, payload: Payload) {
  if (rule.condition === undefined) return true
  const actual = yield* lookup(payload, rule.condition.field)
  return compare(actual, rule.condition.op, rule.condition.value)
})
