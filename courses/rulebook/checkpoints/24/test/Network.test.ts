import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Option, Schema } from "effect"
import { TestClock } from "effect/testing"
import { readdirSync, readFileSync } from "node:fs"
import * as NodePath from "node:path"
import { Engine } from "../src/Engine.ts"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"
import * as Harness from "./harness.ts"
import { captureSpans, layerApp, makeClient, post } from "./support.ts"

const laptop = { type: "expense", amount: 1200 }

// The four rules of the mixed scenario, as the learner adds them.
const mixedDirectory = NodePath.join(import.meta.dirname, "../../../fixtures/rules/mixed")
const mixed = readdirSync(mixedDirectory).toSorted().map((file) =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Rule))(readFileSync(NodePath.join(mixedDirectory, file), "utf8"))
)

const endedWith = (span: { readonly status: { readonly _tag: string } }) => {
  const status = span.status as { readonly _tag: "Ended"; readonly exit: Exit.Exit<unknown, unknown> }
  assert.strictEqual(status._tag, "Ended")
  return status.exit
}

describe("httpPost", () => {
  it.effect("a 200 succeeds, a 500 is failed(status), a planted bug is crashed; none is skipped for availability", () => {
    const { tracer, executions } = captureSpans()
    return Effect.gen(function*() {
      const store = yield* RuleStore
      const engine = yield* Engine
      const ok = yield* store.create({
        ...post("expense over 500", "http://localhost:4600/ok", "ok"),
        condition: { field: "amount", op: "gt", value: 500 }
      })
      const fail = yield* store.create(post("fail", "http://localhost:4600/fail?status=500", "fail"))
      const bug = yield* store.create(post("bug", "http://localhost:4600/bug", "bug"))

      const [okOutcome] = yield* engine.handleEvent({ type: "ok", amount: 1200 })
      const [failOutcome] = yield* engine.handleEvent({ type: "fail" })
      const [bugOutcome] = yield* engine.handleEvent({ type: "bug" })
      assert.deepStrictEqual([okOutcome.outcome, okOutcome.reason], ["succeeded", null])
      const [sent] = (yield* Harness.Remote).requests
      assert.deepStrictEqual([sent.method, sent.url], ["POST", "http://localhost:4600/ok"])
      assert.include(sent.body, "expense over 500", "the rule's message is the body")
      assert.deepStrictEqual([failOutcome.outcome, failOutcome.reason], ["failed", "status"])
      assert.match(String(failOutcome.error), /500/, "the status is recorded")
      assert.strictEqual(bugOutcome.outcome, "crashed")
      assert.match(String(bugOutcome.error), /planted bug/)

      // Checkpoints 12 to 19 skipped a matching httpPost rule; from 20 on it runs.
      const runs = yield* (yield* RunLog).list()
      assert.strictEqual(runs.length, 3)
      for (const run of runs) {
        assert.isFalse(run.outcome === "skipped" && /httpPost/.test(String(run.reason)), `skipped: ${run.reason}`)
      }

      const span = (id: string) => executions().find((execution) => execution.ruleId === id)!.span
      assert.isTrue(Exit.isSuccess(endedWith(span(ok.id))))
      assert.isTrue(Exit.isFailure(endedWith(span(fail.id))), "a 500 ends the span as an Error")
      const crashed = endedWith(span(bug.id))
      assert.isTrue(Exit.isFailure(crashed) && Cause.hasDies(crashed.cause), "a planted bug ends the span as an Error")
    }).pipe(Effect.provide(layerApp()), Effect.withTracer(tracer))
  })

  it.effect("a request that never answers is failed(timeout), released, and its span ends with the TimeoutError", () => {
    const { tracer, executions } = captureSpans()
    return Effect.gen(function*() {
      const remote = yield* Harness.Remote
      yield* (yield* RuleStore).create(post("slow", "http://localhost:4600/slow?ms=15000"))
      const fiber = yield* Effect.forkChild((yield* Engine).handleEvent(laptop))
      yield* Harness.eventually(Effect.sync(() => assert.strictEqual(remote.requests.length, 1, "the POST is sent")))
      yield* TestClock.adjust("10 seconds")
      const [outcome] = yield* Fiber.join(fiber)
      assert.deepStrictEqual([outcome.outcome, outcome.reason], ["failed", "timeout"])
      assert.isTrue(remote.released)

      const [execution] = executions()
      const exit = endedWith(execution.span)
      assert.isTrue(
        Exit.isFailure(exit) && Cause.isTimeoutError(Cause.squash(exit.cause)),
        "the timeout runs inside Engine.execute, so the span ends with the TimeoutError"
      )
    }).pipe(Effect.provide(layerApp()), Effect.withTracer(tracer))
  })

  it.effect("an interrupted execution is recorded as interrupted and its span ends Unset, not Error", () => {
    const { tracer, executions } = captureSpans()
    return Effect.gen(function*() {
      const remote = yield* Harness.Remote
      yield* (yield* RuleStore).create(post("slow", "http://localhost:4600/slow?ms=15000"))
      const fiber = yield* Effect.forkChild((yield* Engine).handleEvent(laptop))
      yield* Harness.eventually(Effect.sync(() => assert.strictEqual(remote.requests.length, 1, "the POST is sent")))
      yield* Fiber.interrupt(fiber)
      const runs = yield* (yield* RunLog).list()
      assert.deepStrictEqual(runs.map((run) => run.outcome), ["interrupted"])
      const exit = endedWith(executions()[0].span)
      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
    }).pipe(Effect.provide(layerApp()), Effect.withTracer(tracer))
  })
})

describe("many at once", () => {
  it.effect("the mixed scenario: all four start together, two succeed, two fail, the event takes the timeout", () => {
    const { spans, tracer, executions } = captureSpans()
    return Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const runLog = yield* RunLog
      const names = new Map<string, string>()
      for (const rule of mixed) {
        const stored = yield* (yield* RuleStore).create(rule)
        names.set(stored.id, rule.action.message)
      }
      const fiber = yield* Effect.forkChild((yield* Engine).handleEvent(laptop))

      // No answer is sent until every request has arrived, so a loop that
      // waits for one action before starting the next never gets there.
      yield* Harness.eventually(
        Effect.sync(() =>
          assert.strictEqual(remote.requests.length, 4, "all four executions start before any finishes")
        )
      )
      assert.deepStrictEqual((yield* runLog.list()).map((run) => run.outcome), [
        "started",
        "started",
        "started",
        "started"
      ])
      yield* remote.answering.open

      yield* TestClock.adjust("9 seconds")
      assert.isUndefined(fiber.pollUnsafe(), "C is still waiting for its timeout")
      yield* TestClock.adjust("1 second")
      const outcomes = yield* Fiber.join(fiber)
      assert.deepStrictEqual(
        outcomes.map((outcome) => [names.get(outcome.ruleId), outcome.outcome, outcome.reason]).toSorted(),
        [["A", "succeeded", null], ["B", "succeeded", null], ["C", "failed", "timeout"], ["D", "failed", "status"]]
      )

      // Four execution spans under the one Engine.handleEvent span: C and D
      // red, A and B Ok.
      const [parent, ...otherParents] = spans.filter((span) => span.name === "Engine.handleEvent")
      assert.deepStrictEqual(otherParents, [])
      const ended = executions().map(({ ruleId, span }) => {
        assert.strictEqual(Option.getOrUndefined(span.parent)?.spanId, parent.spanId)
        return [names.get(String(ruleId)), Exit.isSuccess(endedWith(span))]
      })
      assert.deepStrictEqual(ended.toSorted(), [["A", true], ["B", true], ["C", false], ["D", false]])
    }).pipe(Effect.provide(layerApp({ held: true })), Effect.withTracer(tracer))
  })
})

// Polls `count` until it settles on `expected` and stays there while other
// fibers get the chance to run.
const settlesAt = (count: () => number, expected: number) =>
  Effect.gen(function*() {
    yield* Harness.eventually(Effect.sync(() => assert.strictEqual(count(), expected)))
    for (let i = 0; i < 50; i++) yield* Effect.yieldNow
    assert.strictEqual(count(), expected)
  })

describe("limits", () => {
  it.effect("by default: an event over 64 KiB and the 101st rule are typed errors", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: post("ok", "http://localhost:4600/ok") })

      // The limit counts the UTF-8 bytes of the event's JSON, 65,536 of them.
      // `{"type":"expense","note":""}` is 28 bytes; "é" is 2 bytes but 1 character.
      const event = (note: string) => ({ type: "expense", note })
      const refused = [event("x".repeat(65_509)), event("é".repeat(33_000))]
      for (const payload of refused) {
        const tooLarge = yield* Effect.flip(client.events.submit({ payload }))
        assert.strictEqual(tooLarge._tag, "PayloadTooLarge")
        // `rules run` takes an event too, and the same limit applies to it.
        const manual = yield* Effect.exit(client.rules.run({ params: { id: rule.id }, payload }))
        assert.deepStrictEqual(
          Exit.isFailure(manual) ? Cause.squash(manual.cause) : manual.value,
          tooLarge,
          "rules run refuses the event as events submit does"
        )
      }
      assert.deepStrictEqual(yield* client.runs.list({ query: {} }), [], "a refused event runs nothing")
      const accepted = yield* client.events.submit({ payload: event("x".repeat(65_508)) })
      assert.deepStrictEqual(accepted.map((outcome) => outcome.outcome), ["succeeded"])

      for (let i = 2; i <= 100; i++) {
        yield* client.rules.create({ payload: post(`rule ${i}`, "http://localhost:4600/ok", "other") })
      }
      const tooMany = yield* Effect.flip(client.rules.create({ payload: post("101", "http://localhost:4600/ok") }))
      assert.strictEqual(tooMany._tag, "TooManyRules")
      assert.strictEqual((yield* client.rules.list()).length, 100)
    }).pipe(Effect.provide(layerApp())))

  it.effect("by default: at most four executions run at once", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      for (let i = 1; i <= 5; i++) {
        yield* (yield* RuleStore).create(post(`slow ${i}`, "http://localhost:4600/slow?ms=15000"))
      }
      yield* Effect.forkChild((yield* Engine).handleEvent(laptop))
      yield* settlesAt(() => remote.requests.length, 4)
    }).pipe(Effect.provide(layerApp())))

  it.effect("every limit is read from the environment", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      for (let i = 1; i <= 3; i++) {
        yield* client.rules.create({ payload: post(`slow ${i}`, "http://localhost:4600/slow?ms=15000") })
      }
      const tooMany = yield* Effect.flip(client.rules.create({ payload: post("4", "http://localhost:4600/ok") }))
      assert.strictEqual(tooMany._tag, "TooManyRules")
      const tooLarge = yield* Effect.flip(
        client.events.submit({ payload: { type: "expense", note: "x".repeat(2_000) } })
      )
      assert.strictEqual(tooLarge._tag, "PayloadTooLarge")

      const fiber = yield* Effect.forkChild((yield* Engine).handleEvent(laptop))
      yield* settlesAt(() => remote.requests.length, 2)
      yield* TestClock.adjust("2 seconds")
      yield* settlesAt(() => remote.requests.length, 3)
      yield* TestClock.adjust("2 seconds")
      const outcomes = yield* Fiber.join(fiber)
      assert.deepStrictEqual(outcomes.map((outcome) => [outcome.outcome, outcome.reason]), [
        ["failed", "timeout"],
        ["failed", "timeout"],
        ["failed", "timeout"]
      ])
    }).pipe(Effect.provide(layerApp({
      env: {
        RULEBOOK_MAX_RULES: "3",
        RULEBOOK_MAX_PAYLOAD_BYTES: "1024",
        RULEBOOK_TIMEOUT: "2 seconds",
        RULEBOOK_CONCURRENCY: "2"
      }
    }))))
})
