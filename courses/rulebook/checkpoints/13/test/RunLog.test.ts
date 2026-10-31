import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import { TestClock } from "effect/testing"
import { RunLog } from "../src/RunLog.ts"

layer(RunLog.layerMemory, { buildPerTest: true })("RunLog memory", (it) => {
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
  // are null.
  it.effect("stores reason and error with each terminal row", () =>
    Effect.gen(function*() {
      const runLog = yield* RunLog
      const skipped = yield* runLog.start({ ruleId: "a", trigger: "event" })
      const failed = yield* runLog.start({ ruleId: "a", trigger: "event" })
      const succeeded = yield* runLog.start({ ruleId: "a", trigger: "event" })
      yield* runLog.finish(skipped.id, { outcome: "skipped", reason: "missing field amount" })
      yield* runLog.finish(failed.id, { outcome: "failed", reason: "io", error: "permission denied" })
      yield* runLog.finish(succeeded.id, { outcome: "succeeded" })

      const rows = new Map((yield* runLog.list()).map((run) => [run.id, [run.outcome, run.reason, run.error]]))
      assert.deepStrictEqual(rows.get(skipped.id), ["skipped", "missing field amount", null])
      assert.deepStrictEqual(rows.get(failed.id), ["failed", "io", "permission denied"])
      assert.deepStrictEqual(rows.get(succeeded.id), ["succeeded", null, null])
    }))
})
