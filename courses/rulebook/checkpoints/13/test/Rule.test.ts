import { NodeServices } from "@effect/platform-node"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem, Path, Schema } from "effect"
import { Rule } from "../src/Rule.ts"

// A rule file is JSON text, so it is decoded in one step from the string.
const decodeRule = Schema.decodeUnknownEffect(Schema.fromJsonString(Rule))

const readFixture = Effect.fn("readFixture")(function*(name: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  return yield* fs.readFileString(path.join(import.meta.dirname, "../../../fixtures/rules", name))
})

layer(NodeServices.layer)("Rule", (it) => {
  it.effect("decodes event and interval triggers, both actions, with and without a condition", () =>
    Effect.gen(function*() {
      const files = ["expense.json", "every-expense.json", "ntfy.json", "status-degraded.json"]
      const [expense, every, ntfy, status] = yield* Effect.forEach(
        files,
        (file) => readFixture(file).pipe(Effect.flatMap(decodeRule))
      )
      assert.deepStrictEqual(expense.trigger, { type: "event", event: "expense" })
      assert.deepStrictEqual(expense.condition, { field: "amount", op: "gt", value: 500 })
      assert.strictEqual(expense.action.type, "appendFile")
      assert.isUndefined(every.condition)
      assert.strictEqual(ntfy.action.type, "httpPost")
      assert.deepStrictEqual(status.trigger, {
        type: "interval",
        everySeconds: 5,
        url: "http://localhost:4600/status"
      })
    }))

  it.effect("accepts each of the five condition operators", () =>
    Effect.gen(function*() {
      for (const op of ["eq", "neq", "gt", "lt", "contains"]) {
        const rule = yield* decodeRule(JSON.stringify({
          name: op,
          trigger: { type: "event", event: "expense" },
          condition: { field: "description", op, value: "laptop" },
          action: { type: "appendFile", path: "alerts.log", message: op }
        }))
        assert.strictEqual(rule.condition?.op, op)
      }
    }))

  it.effect("fails with a SchemaError, not an exception, for a malformed rule or broken JSON", () =>
    Effect.gen(function*() {
      const malformed = yield* readFixture("malformed.json").pipe(Effect.flatMap(decodeRule), Effect.flip)
      assert.isTrue(Schema.isSchemaError(malformed))
      const broken = yield* Effect.flip(decodeRule("{ \"name\": "))
      assert.isTrue(Schema.isSchemaError(broken))
    }))
})
