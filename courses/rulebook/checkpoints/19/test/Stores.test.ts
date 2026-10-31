import { NodeServices } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, it, layer } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Schema } from "effect"
import { TestClock } from "effect/testing"
import * as Migrations from "../src/Migrations.ts"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"

// A SQLite database with the supplied migrations applied.
const sqlite = (filename: string) =>
  Migrations.layer.pipe(
    Layer.provideMerge(SqliteClient.layer({ filename })),
    Layer.provide(NodeServices.layer)
  )

const rule = (name: string) =>
  Schema.decodeUnknownSync(Rule)({
    name,
    trigger: { type: "event", event: "expense" },
    action: { type: "appendFile", path: "alerts.log", message: name }
  })

// Every optional part of a rule, so the stored JSON has to keep all of it.
const poll = Schema.decodeUnknownSync(Rule)({
  name: "receiver degraded",
  trigger: { type: "interval", everySeconds: 5, url: "http://localhost:4600/status" },
  condition: { field: "body.status", op: "eq", value: "degraded" },
  action: {
    type: "httpPost",
    url: "https://ntfy.sh/topic",
    message: "receiver is degraded",
    headers: { Title: "rulebook" },
    includePayload: true
  }
})

// The lesson 13 suites as functions of a layer, so the memory and the SQLite
// stores answer the same questions.

const ruleStoreSuite = (name: string, store: Layer.Layer<RuleStore, unknown>) =>
  layer(store, { buildPerTest: true })(name, (it) => {
    it.effect("creates, lists, gets and removes rules", () =>
      Effect.gen(function*() {
        const store = yield* RuleStore
        const first = yield* store.create(rule("first"))
        yield* TestClock.adjust("1 second")
        const second = yield* store.create(poll)
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

const runLogSuite = (name: string, runLog: Layer.Layer<RunLog, unknown>) =>
  layer(runLog, { buildPerTest: true })(name, (it) => {
    it.effect("lists runs newest first, filtered by rule id and limited", () =>
      Effect.gen(function*() {
        const runLog = yield* RunLog
        const a1 = yield* runLog.start({ ruleId: "a", trigger: "event" })
        yield* TestClock.adjust("1 second")
        const b1 = yield* runLog.start({ ruleId: "b", trigger: "event" })
        yield* TestClock.adjust("1 second")
        const a2 = yield* runLog.start({ ruleId: "a", trigger: "event" })
        yield* runLog.finish(a1.id, { outcome: "succeeded" })

        const ids = (runs: ReadonlyArray<{ readonly id: string }>) => runs.map((run) => run.id)
        assert.deepStrictEqual(ids(yield* runLog.list()), [a2.id, b1.id, a1.id])
        assert.deepStrictEqual(ids(yield* runLog.list({ ruleId: "a" })), [a2.id, a1.id])
        assert.deepStrictEqual(ids(yield* runLog.list({ limit: 2 })), [a2.id, b1.id])
        assert.deepStrictEqual(ids(yield* runLog.list({ ruleId: "a", limit: 1 })), [a2.id])

        const outcomes = (yield* runLog.list({ ruleId: "a" })).map((run) => run.outcome)
        assert.deepStrictEqual(outcomes, ["started", "succeeded"])
      }))

    // The column contract: on failed, reason is one of status, timeout, io and
    // error carries the detail; on skipped, reason is free text; otherwise both
    // are null. Against SQLite this also passes the CHECK on runs.reason.
    it.effect("stores reason and error with each terminal row", () =>
      Effect.gen(function*() {
        const runLog = yield* RunLog
        const results = [
          { outcome: "skipped", reason: "missing field amount" },
          { outcome: "failed", reason: "status", error: "500 Internal Server Error" },
          { outcome: "failed", reason: "timeout", error: "timed out after 10 seconds" },
          { outcome: "failed", reason: "io", error: "permission denied" },
          { outcome: "succeeded" }
        ] as const
        const ids: Array<string> = []
        for (const result of results) {
          const { id } = yield* runLog.start({ ruleId: "a", trigger: "interval" })
          yield* runLog.finish(id, result)
          ids.push(id)
        }

        const rows = new Map((yield* runLog.list()).map((run) => [run.id, [run.outcome, run.reason, run.error]]))
        assert.deepStrictEqual(ids.map((id) => rows.get(id)), [
          ["skipped", "missing field amount", null],
          ["failed", "status", "500 Internal Server Error"],
          ["failed", "timeout", "timed out after 10 seconds"],
          ["failed", "io", "permission denied"],
          ["succeeded", null, null]
        ])
      }))
  })

ruleStoreSuite("RuleStore memory", RuleStore.layerMemory)
ruleStoreSuite("RuleStore SQLite", RuleStore.layerSql.pipe(Layer.provide(sqlite(":memory:"))))
runLogSuite("RunLog memory", RunLog.layerMemory)
runLogSuite("RunLog SQLite", RunLog.layerSql.pipe(Layer.provide(sqlite(":memory:"))))

it.effect("rules and runs survive rebuilding the SQLite layers on the same file", () =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const stores = Layer.merge(RuleStore.layerSql, RunLog.layerSql).pipe(
      Layer.provide(sqlite(path.join(yield* fs.makeTempDirectoryScoped(), "rulebook.db")))
    )

    const before = yield* Effect.gen(function*() {
      const stored = yield* (yield* RuleStore).create(poll)
      const runLog = yield* RunLog
      const run = yield* runLog.start({ ruleId: stored.id, trigger: "interval" })
      yield* runLog.finish(run.id, { outcome: "succeeded" })
      return { rules: [stored], runs: yield* runLog.list() }
    }).pipe(Effect.provide(stores))

    const after = yield* Effect.gen(function*() {
      return { rules: yield* (yield* RuleStore).list, runs: yield* (yield* RunLog).list() }
    }).pipe(Effect.provide(stores))

    const rows = (runs: ReadonlyArray<{ readonly id: string; readonly ruleId: string; readonly outcome: string }>) =>
      runs.map((run) => [run.id, run.ruleId, run.outcome])
    assert.deepStrictEqual(after.rules, before.rules)
    assert.deepStrictEqual(rows(after.runs), rows(before.runs))
  }).pipe(Effect.provide(NodeServices.layer)))
