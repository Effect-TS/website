import { NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Runtime } from "effect"
import { Command } from "effect/cli"
import { TestClock, TestConsole } from "effect/testing"
import { ApiClient } from "../src/ApiClient.ts"
import { cli } from "../src/cli/main.ts"
import type { Rule } from "../src/Rule.ts"
import * as Harness from "./harness.ts"
import { captureSpans, layerApp, layerServer, makeClient, post } from "./support.ts"

// Each tick's request hangs until the timeout, so after an adjust shorter
// than that a running loop has made exactly one request, whenever it ticked.
const poll: Rule = {
  name: "receiver status",
  trigger: { type: "interval", everySeconds: 5, url: "http://localhost:4600/slow" },
  action: { type: "appendFile", path: "alerts.log", message: "polled" }
}

// The CLI over an ApiClient whose HttpClient hands every request to the
// served API in memory.
const layerCli = ApiClient.layer.pipe(
  Layer.provide(layerServer()),
  Layer.merge(NodeServices.layer),
  Layer.merge(TestConsole.layer)
)

describe("pause and resume", () => {
  it.effect("a paused rule stays listed as paused and skips events, no row and no span; resume brings it back", () => {
    const { tracer, executions } = captureSpans()
    return Effect.gen(function*() {
      const client = yield* makeClient
      const paused = yield* client.rules.create({ payload: post("A", "http://localhost:4600/ok") })
      const other = yield* client.rules.create({ payload: post("B", "http://localhost:4600/ok") })
      const status = (id: string) =>
        client.rules.list().pipe(Effect.map((rules) => rules.find((rule) => rule.id === id)?.status))
      const submit = client.events.submit({ payload: { type: "expense", amount: 1200 } }).pipe(
        Effect.map((outcomes) => outcomes.map((outcome) => outcome.ruleId))
      )

      yield* client.rules.pause({ params: { id: paused.id } })
      assert.strictEqual(yield* status(paused.id), "paused")
      assert.deepStrictEqual(yield* submit, [other.id])
      assert.deepStrictEqual(yield* client.runs.list({ query: { ruleId: paused.id } }), [])
      assert.deepStrictEqual(executions().map((execution) => execution.ruleId), [other.id])

      yield* client.rules.resume({ params: { id: paused.id } })
      assert.notStrictEqual(yield* status(paused.id), "paused")
      assert.deepStrictEqual((yield* submit).toSorted(), [paused.id, other.id].toSorted())
      assert.strictEqual((yield* client.runs.list({ query: { ruleId: paused.id } })).length, 1)
    }).pipe(Effect.provide(layerApp()), Effect.withTracer(tracer))
  })

  it.effect("pausing an interval rule stops its loop; resuming starts it again", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: poll })
      const rows = client.runs.list({ query: { ruleId: rule.id } }).pipe(Effect.map((runs) => runs.length))
      const status = client.rules.list().pipe(Effect.map((rules) => rules.find((r) => r.id === rule.id)?.status))
      yield* Harness.eventually(Effect.map(rows, (rows) => assert.strictEqual(rows, 1)))

      yield* client.rules.pause({ params: { id: rule.id } })
      assert.strictEqual(yield* status, "paused")
      yield* TestClock.adjust("6 seconds")
      assert.strictEqual(remote.requests.length, 1, "no request after pause")
      assert.strictEqual(yield* rows, 1, "no row after pause")

      // The positive control: the same harness sees the resumed loop.
      yield* client.rules.resume({ params: { id: rule.id } })
      yield* TestClock.adjust("6 seconds")
      yield* Harness.eventually(Effect.map(rows, (rows) => assert.strictEqual(rows, 2)))
      assert.strictEqual(remote.requests.length, 2)
      assert.strictEqual(yield* status, "running")
    }).pipe(Effect.provide(layerApp())))

  it.effect("pausing or resuming an unknown rule is RuleNotFound from the API and one line from the CLI", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      for (const call of [client.rules.pause, client.rules.resume]) {
        const error = yield* Effect.flip(call({ params: { id: "missing" } }))
        assert.strictEqual(error._tag, "RuleNotFound")
      }

      const printed = Effect.map(
        Effect.all([TestConsole.logLines, TestConsole.errorLines]),
        (lines) => lines.flat().map(String)
      )
      yield* Effect.gen(function*() {
        for (const command of ["pause", "resume"]) {
          const before = (yield* printed).length
          const exit = yield* Effect.exit(Command.runWith(cli, { version: "0.0.0" })(["rules", command, "missing"]))
          const lines = (yield* printed).slice(before)
          assert.strictEqual(lines.length, 1, lines.join("\n"))
          assert.include(lines[0], "missing")
          // The command fails, so the process exits non-zero, and runMain does
          // not report the error again: the one line is all that is printed.
          if (Exit.isSuccess(exit)) return assert.fail(`rules ${command} of a missing rule exits 0`)
          const error = Cause.squash(exit.cause)
          assert.notStrictEqual(Runtime.getErrorExitCode(error), 0)
          assert.isFalse(Runtime.getErrorReported(error), "runMain would print the error after the line")
        }
      }).pipe(Effect.provide(layerCli))
    }).pipe(Effect.provide(layerApp())))
})
