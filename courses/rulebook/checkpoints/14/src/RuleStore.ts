import { Context, Effect, Layer, Schema } from "effect"
import { Rule } from "./Rule.ts"

// A rule once it is stored: the definition plus the id the store gave it.
export const StoredRule = Schema.Struct({ id: Schema.String, ...Rule.fields })
export type StoredRule = typeof StoredRule.Type

export class RuleNotFound extends Schema.TaggedError<RuleNotFound>()("RuleNotFound", {
  id: Schema.String
}) {}

export class RuleStore extends Context.Service<RuleStore, {
  readonly create: (rule: Rule) => Effect.Effect<StoredRule>
  readonly list: Effect.Effect<ReadonlyArray<StoredRule>>
  readonly get: (id: string) => Effect.Effect<StoredRule, RuleNotFound>
  readonly remove: (id: string) => Effect.Effect<void, RuleNotFound>
}>()("rulebook/RuleStore") {
  // Rules in a Map, gone when the process ends. Lesson 17 adds SQLite.
  static readonly layerMemory = Layer.effect(
    RuleStore,
    Effect.gen(function*() {
      const rules = new Map<string, StoredRule>()

      const create = Effect.fn("RuleStore.create")(function*(rule: Rule) {
        const stored = { id: crypto.randomUUID(), ...rule }
        rules.set(stored.id, stored)
        return stored
      })

      const get = Effect.fn("RuleStore.get")(function*(id: string) {
        const rule = rules.get(id)
        if (rule === undefined) {
          return yield* new RuleNotFound({ id })
        }
        return rule
      })

      const remove = Effect.fn("RuleStore.remove")(function*(id: string) {
        if (!rules.delete(id)) {
          return yield* new RuleNotFound({ id })
        }
      })

      return RuleStore.of({
        create,
        list: Effect.sync(() => Array.from(rules.values())),
        get,
        remove
      })
    })
  )
}
