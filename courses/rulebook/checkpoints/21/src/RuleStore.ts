import { Context, DateTime, Effect, Layer, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
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
  // Rules in a Map, gone when the process ends.
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

  // Rules in the `rules` table, one row per rule with the definition as JSON.
  // The table survives the process; migrations/ creates it.
  static readonly layerSql = Layer.effect(
    RuleStore,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      // The definition column holds the rule as JSON text. The same schema
      // turns it into text on the way in and back into a Rule on the way out.
      const Row = Schema.Struct({ id: Schema.String, definition_json: Schema.fromJsonString(Rule) })
      const toStored = (row: typeof Row.Type): StoredRule => ({ id: row.id, ...row.definition_json })

      const insert = SqlSchema.void({
        Request: Schema.Struct({ ...Row.fields, created_at: Schema.String }),
        execute: (row) => sql`INSERT INTO rules ${sql.insert(row)}`
      })

      const findAll = SqlSchema.findAll({
        Request: Schema.Void,
        Result: Row,
        execute: () => sql`SELECT id, definition_json FROM rules ORDER BY created_at, rowid`
      })

      const findById = SqlSchema.findAll({
        Request: Schema.String,
        Result: Row,
        execute: (id) => sql`SELECT id, definition_json FROM rules WHERE id = ${id}`
      })

      const create = Effect.fn("RuleStore.create")(function*(rule: Rule) {
        const id = crypto.randomUUID()
        const createdAt = DateTime.formatIso(yield* DateTime.now)
        yield* insert({ id, definition_json: rule, created_at: createdAt })
        return { id, ...rule }
      }, Effect.orDie)

      const get = Effect.fn("RuleStore.get")(function*(id: string) {
        const [row] = yield* findById(id).pipe(Effect.orDie)
        if (row === undefined) {
          return yield* new RuleNotFound({ id })
        }
        return toStored(row)
      })

      const remove = Effect.fn("RuleStore.remove")(function*(id: string) {
        const deleted = yield* sql`DELETE FROM rules WHERE id = ${id} RETURNING id`.pipe(Effect.orDie)
        if (deleted.length === 0) {
          return yield* new RuleNotFound({ id })
        }
      })

      return RuleStore.of({
        create,
        list: findAll(undefined).pipe(Effect.map((rows) => rows.map(toStored)), Effect.orDie),
        get,
        remove
      })
    })
  )
}
