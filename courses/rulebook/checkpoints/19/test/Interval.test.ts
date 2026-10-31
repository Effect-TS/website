import { NodeServices } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import {
  Cause,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Latch,
  Layer,
  Logger,
  type LogLevel,
  Path,
  PlatformError,
  Schema,
  Tracer
} from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { TestClock } from "effect/testing"
import { Api } from "../src/api/Api.ts"
import { Engine } from "../src/Engine.ts"
import * as Migrations from "../src/Migrations.ts"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"
import * as ApiHandlers from "../src/server/Api.ts"
import * as Harness from "./harness.ts"

const makeClient = HttpApiTest.groups(Api, ["rules", "events", "runs"])

// Accepts every write and keeps nothing, except that a write under /denied/
// fails as a file the process may not write.
const write = (path: string) =>
  path.startsWith("/denied/")
    ? Effect.fail(PlatformError.systemError({
      _tag: "PermissionDenied",
      module: "FileSystem",
      method: "writeFile",
      pathOrDescriptor: path
    }))
    : Effect.void

const fileSystem = FileSystem.layerNoop({
  writeFileString: (path) => write(path),
  writeFile: (path) => write(path)
})

// The Engine over the given stores, polling through the fake server.
const layerEngine = <E>(
  stores: Layer.Layer<RuleStore | RunLog, E>,
  reply: Harness.Reply,
  fs: Layer.Layer<FileSystem.FileSystem> = fileSystem
) =>
  Engine.layer.pipe(
    Layer.provideMerge(stores),
    Layer.provideMerge(Harness.layer(reply)),
    Layer.provide(fs)
  )

// The memory stores, with a RunLog whose terminal write always fails.
const layerStoresFailingFinish = Layer.merge(
  RuleStore.layerMemory,
  Layer.effect(
    RunLog,
    Effect.gen(function*() {
      const inner = yield* RunLog
      return RunLog.of({ ...inner, finish: () => Effect.die(new Error("disk full")) })
    })
  ).pipe(Layer.provide(RunLog.layerMemory))
)

const expense = (path: string): Rule => ({
  name: path,
  trigger: { type: "event", event: "expense" },
  action: { type: "appendFile", path, message: "expense" }
})

// The served API over the Engine and the memory stores.
const layerApp = (reply: Harness.Reply) =>
  ApiHandlers.layer.pipe(
    Layer.provideMerge(layerEngine(Layer.merge(RuleStore.layerMemory, RunLog.layerMemory), reply)),
    Layer.merge(HttpServer.layerServices)
  )

// Every log line with its level, annotations and cause, as logfmt text.
const captureLogs = () => {
  const lines: Array<{ readonly level: LogLevel.LogLevel; readonly text: string }> = []
  const layer = Logger.layer([
    Logger.make((options) => lines.push({ level: options.logLevel, text: Logger.formatLogFmt.log(options) }))
  ])
  return { lines, layer }
}

const poll: Rule = {
  name: "receiver status",
  trigger: { type: "interval", everySeconds: 5, url: "http://localhost:4600/status" },
  action: { type: "appendFile", path: "alerts.log", message: "polled" }
}

describe("interval rules", () => {
  it.effect("remove interrupts a poll in flight, records it as interrupted, and no request follows", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: poll })
      yield* remote.arrived.await
      const outcomes = client.runs.list({ query: { ruleId: rule.id } }).pipe(
        Effect.map((runs) => runs.map((run) => run.outcome))
      )
      assert.deepStrictEqual(yield* outcomes, ["started"], "the row opens before the GET")

      yield* client.rules.remove({ params: { id: rule.id } })
      assert.isTrue(remote.released, "remove returns after the request was released")
      assert.deepStrictEqual(yield* outcomes, ["interrupted"])

      yield* TestClock.adjust("6 seconds")
      assert.strictEqual(remote.requests.length, 1)
    }).pipe(Effect.provide(layerApp({ _tag: "Hang" }))))

  it.effect("a 500 is failed with reason status and the loop goes on; removing it between ticks writes no row", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: poll })
      const rows = client.runs.list({ query: { ruleId: rule.id } }).pipe(
        Effect.map((runs) => runs.map((run) => [run.outcome, run.reason]))
      )
      const status = client.rules.list().pipe(Effect.map((rules) => rules.find((r) => r.id === rule.id)?.status))

      yield* Harness.eventually(Effect.map(rows, (rows) => assert.deepStrictEqual(rows, [["failed", "status"]])))
      assert.strictEqual(yield* status, "running")

      yield* TestClock.adjust("5 seconds")
      yield* Harness.eventually(
        Effect.map(rows, (rows) => assert.deepStrictEqual(rows, [["failed", "status"], ["failed", "status"]]))
      )
      assert.strictEqual(yield* status, "running")
      assert.strictEqual(remote.requests.length, 2)

      yield* client.rules.remove({ params: { id: rule.id } })
      yield* TestClock.adjust("6 seconds")
      assert.deepStrictEqual(yield* rows, [["failed", "status"], ["failed", "status"]])
      assert.strictEqual(remote.requests.length, 2)
    }).pipe(Effect.provide(layerApp({ _tag: "Respond", status: 500, body: { status: "error" } }))))

  it.effect("a poll past the per-run timeout is failed with reason timeout inside the span and released", () => {
    const spans: Array<Tracer.NativeSpan> = []
    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options)
        spans.push(span)
        return span
      }
    })

    return Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: poll })
      yield* remote.arrived.await
      yield* TestClock.adjust("10 seconds")
      yield* Harness.eventually(Effect.gen(function*() {
        const runs = yield* client.runs.list({ query: { ruleId: rule.id } })
        assert.deepStrictEqual(runs.map((run) => [run.outcome, run.reason]), [["failed", "timeout"]])
      }))
      assert.isTrue(remote.released)

      // The timeout runs inside Engine.execute, so the span ends with the
      // TimeoutError (an Error in the viewer), not with an interruption.
      const [execution, ...others] = spans.filter((span) => span.name === "Engine.execute")
      assert.deepStrictEqual(others, [])
      const status = execution.status
      assert.isTrue(
        status._tag === "Ended" && Exit.isFailure(status.exit) && Cause.isTimeoutError(Cause.squash(status.exit.cause)),
        "the Engine.execute span ends with the TimeoutError"
      )
    }).pipe(Effect.provide(layerApp({ _tag: "Hang" })), Effect.withTracer(tracer))
  })

  it.effect("rules run on an interval rule polls its URL inside the run, apart from the loop's ticks", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: poll })
      const rows = client.runs.list({ query: { ruleId: rule.id } }).pipe(
        Effect.map((runs) => runs.map((run) => [run.outcome, run.reason]))
      )
      yield* Harness.eventually(Effect.map(rows, (rows) => assert.deepStrictEqual(rows, [["failed", "status"]])))

      // The event is not the payload of an interval rule: the run GETs the URL,
      // so the 500 fails it with reason status.
      const outcome = yield* client.rules.run({ params: { id: rule.id }, payload: { type: "expense", amount: 1200 } })
      assert.deepStrictEqual([outcome.outcome, outcome.reason], ["failed", "status"])
      assert.strictEqual(remote.requests.length, 2, "the manual run made its own request")
      assert.deepStrictEqual(yield* rows, [["failed", "status"], ["failed", "status"]])
    }).pipe(Effect.provide(layerApp({ _tag: "Respond", status: 500, body: { status: "error" } }))))

  it.effect("a defect in a tick is one crashed row and stops the loop; removing the stopped rule only deletes", () =>
    Effect.gen(function*() {
      const remote = yield* Harness.Remote
      const client = yield* makeClient
      const rule = yield* client.rules.create({ payload: poll })
      const runs = client.runs.list({ query: { ruleId: rule.id } })

      yield* Harness.eventually(Effect.gen(function*() {
        const [crashed, ...rest] = yield* runs
        assert.deepStrictEqual(rest, [])
        assert.strictEqual(crashed.outcome, "crashed")
        assert.match(String(crashed.error), /planted bug/)
        assert.strictEqual(
          (yield* client.rules.list()).find((r) => r.id === rule.id)?.status,
          "stopped",
          "rules list asks whether the loop still runs"
        )
      }))

      yield* TestClock.adjust("6 seconds")
      assert.strictEqual(remote.requests.length, 1)
      const before = yield* runs

      yield* client.rules.remove({ params: { id: rule.id } })
      assert.deepStrictEqual((yield* client.rules.list()).map((r) => r.id), [])
      assert.deepStrictEqual(yield* runs, before)
    }).pipe(Effect.provide(layerApp({ _tag: "Die", message: "planted bug" }))))

  it.effect("on boot, started rows become abandoned and stored interval rules start; shutdown logs the interrupt", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filename = path.join(yield* fs.makeTempDirectoryScoped(), "rulebook.db")
      const stores = Layer.merge(RuleStore.layerSql, RunLog.layerSql).pipe(
        Layer.provide(Migrations.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename })))),
        Layer.provide(NodeServices.layer)
      )

      // The previous process stored a rule and died during a run.
      const { rule, previous } = yield* Effect.gen(function*() {
        const rule = yield* (yield* RuleStore).create(poll)
        const previous = yield* (yield* RunLog).start({ ruleId: rule.id, trigger: "interval" })
        return { rule, previous }
      }).pipe(Effect.provide(stores))

      const logs = captureLogs()
      const linesBeforeShutdown = yield* Effect.gen(function*() {
        yield* (yield* Harness.Remote).arrived.await
        const runs = yield* (yield* RunLog).list({ ruleId: rule.id })
        assert.deepStrictEqual(
          runs.map((run) => [run.id === previous.id, run.outcome]).toSorted(),
          [[false, "started"], [true, "abandoned"]]
        )
        return logs.lines.length
      }).pipe(
        Effect.provide(layerEngine(stores, { _tag: "Hang" })),
        Effect.provide(logs.layer)
      )

      const shutdown = logs.lines.slice(linesBeforeShutdown)
      assert.isTrue(
        shutdown.some((line) => line.text.includes(rule.id)),
        "the loop logs its interruption with the rule id when the layer's scope closes"
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a failed terminal write is logged with the run id, leaves the row started and keeps the outcome", () => {
    const logs = captureLogs()
    return Effect.gen(function*() {
      const store = yield* RuleStore
      for (const path of ["alerts.log", "/denied/alerts.log"]) {
        yield* store.create(expense(path))
      }
      const outcomes = yield* (yield* Engine).handleEvent({ type: "expense", amount: 1200 })
      assert.deepStrictEqual(
        outcomes.map((outcome) => [outcome.outcome, outcome.reason]).toSorted(),
        [["failed", "io"], ["succeeded", null]],
        "each run returns its own result, success or failure, despite the failed write"
      )
      const runs = yield* (yield* RunLog).list()
      assert.deepStrictEqual(
        runs.map((run) => [run.id, run.outcome]).toSorted(),
        outcomes.map((outcome) => [outcome.runId, "started"]).toSorted()
      )
      for (const outcome of outcomes) {
        assert.isTrue(
          logs.lines.some((line) => line.level === "Error" && line.text.includes(outcome.runId)),
          `the failed write of the ${outcome.outcome} run is logged at error level with its run id`
        )
      }
    }).pipe(
      Effect.provide(layerEngine(layerStoresFailingFinish, { _tag: "Hang" })),
      Effect.provide(logs.layer)
    )
  })

  it.effect("an interrupted run whose terminal write fails still ends with only the interruption", () => {
    const logs = captureLogs()
    // A FileSystem whose write never completes; `writing` opens when it starts.
    const writing = Latch.makeUnsafe()
    const hang = () => Effect.andThen(writing.open, Effect.never)
    const fileSystem = FileSystem.layerNoop({ writeFileString: hang, writeFile: hang })

    return Effect.gen(function*() {
      yield* (yield* RuleStore).create(expense("alerts.log"))
      const fiber = yield* Effect.forkChild((yield* Engine).handleEvent({ type: "expense", amount: 1200 }))
      yield* writing.await
      yield* Fiber.interrupt(fiber)
      const exit = yield* Fiber.await(fiber)
      assert.isTrue(
        Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause),
        "the write failure is not added to the interruption"
      )
      const [run, ...others] = yield* (yield* RunLog).list()
      assert.deepStrictEqual(others, [])
      assert.strictEqual(run.outcome, "started")
      assert.isTrue(logs.lines.some((line) => line.level === "Error" && line.text.includes(run.id)))
    }).pipe(
      Effect.provide(layerEngine(layerStoresFailingFinish, { _tag: "Hang" }, fileSystem)),
      Effect.provide(logs.layer)
    )
  })
})

describe("Rule", () => {
  it("an interval shorter than 5 seconds is rejected by the schema", () => {
    const every = (everySeconds: number) =>
      Schema.decodeUnknownExit(Rule)({ ...poll, trigger: { ...poll.trigger, everySeconds } })
    assert.isTrue(Exit.isFailure(every(4)))
    assert.isTrue(Exit.isSuccess(every(5)))
  })
})
