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
})
