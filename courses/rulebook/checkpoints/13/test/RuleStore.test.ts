import { assert, layer } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"

const rule = (name: string) =>
  Schema.decodeUnknownSync(Rule)({
    name,
    trigger: { type: "event", event: "expense" },
    action: { type: "appendFile", path: "alerts.log", message: name }
  })

layer(RuleStore.layerMemory, { buildPerTest: true })("RuleStore memory", (it) => {
  it.effect("creates, lists, gets and removes rules", () =>
    Effect.gen(function*() {
      const store = yield* RuleStore
      const first = yield* store.create(rule("first"))
      const second = yield* store.create(rule("second"))
      assert.notStrictEqual(first.id, second.id)
      assert.deepStrictEqual(yield* store.list, [first, second])
      assert.deepStrictEqual(yield* store.get(second.id), second)
      yield* store.remove(first.id)
      assert.deepStrictEqual(yield* store.list, [second])
    }))

  it.effect("get of an unknown id fails with RuleNotFound", () =>
    Effect.gen(function*() {
      const store = yield* RuleStore
      const error = yield* Effect.flip(store.get("missing"))
      assert.strictEqual(error._tag, "RuleNotFound")
      assert.strictEqual(error.id, "missing")
    }))

  it.effect("remove of an unknown or already removed id fails with RuleNotFound", () =>
    Effect.gen(function*() {
      const store = yield* RuleStore
      const { id } = yield* store.create(rule("once"))
      yield* store.remove(id)
      const error = yield* Effect.flip(store.remove(id))
      assert.strictEqual(error._tag, "RuleNotFound")
      assert.strictEqual(error.id, id)
    }))
})
