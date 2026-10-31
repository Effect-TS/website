import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, FileSystem, Layer, Option, PlatformError, Schema, Tracer } from "effect"
import { Engine } from "../src/Engine.ts"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"

// Fresh stores, a recording FileSystem and a capturing tracer for every test.
// The FileSystem is FileSystem.layerNoop with the two write methods replaced:
// every write attempt records the rule id of the Engine.execute span it runs
// inside (undefined outside one); a write under /denied/ then fails with a
// PlatformError, any other write is recorded together with the run rows that
// existed when it happened. RunLog is the memory layer with `finish` counted,
// so a test can see how many times each run was finalised.
const setup = () => {
  const writes: Array<{ readonly path: string; readonly data: string; readonly flag: string | undefined }> = []
  const rowsAtWrite: Array<ReadonlyArray<{ readonly ruleId: string; readonly outcome: string }>> = []
  const finished: Array<string> = []
  const executingAtWrite: Array<unknown> = []
  const spans: Array<Tracer.NativeSpan> = []

  const runLog = Layer.effect(
    RunLog,
    Effect.gen(function*() {
      const inner = yield* RunLog
      return RunLog.of({
        ...inner,
        finish: (id, result) => Effect.sync(() => finished.push(id)).pipe(Effect.andThen(inner.finish(id, result)))
      })
    })
  ).pipe(Layer.provide(RunLog.layerMemory))

  const fileSystem = Layer.effect(
    FileSystem.FileSystem,
    Effect.gen(function*() {
      const log = yield* RunLog
      const record = (path: string, data: string, flag: string | undefined) =>
        Effect.option(Effect.currentSpan).pipe(Effect.map((span) => {
          executingAtWrite.push(executingRule(Option.getOrUndefined(span)))
        })).pipe(Effect.andThen(
          path.startsWith("/denied/")
            ? Effect.fail(PlatformError.systemError({
              _tag: "PermissionDenied",
              module: "FileSystem",
              method: "writeFile",
              pathOrDescriptor: path
            }))
            : log.list().pipe(Effect.map((rows) => {
              rowsAtWrite.push(rows)
              writes.push({ path, data, flag })
            }))
        ))
      return FileSystem.makeNoop({
        writeFileString: (path, data, options) => record(path, data, options?.flag),
        writeFile: (path, data, options) => record(path, new TextDecoder().decode(data), options?.flag)
      })
    })
  )

  const tracer = Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    }
  })

  const layer = Engine.layer.pipe(
    Layer.provideMerge(RuleStore.layerMemory),
    Layer.provideMerge(fileSystem),
    Layer.provideMerge(runLog)
  )
  const provide = <A, E>(effect: Effect.Effect<A, E, Engine | RuleStore | RunLog>) =>
    effect.pipe(Effect.provide(layer), Effect.withTracer(tracer))

  return { writes, rowsAtWrite, finished, executingAtWrite, spans, provide }
}

// The rule id of the nearest Engine.execute span at or above `span`.
const executingRule = (span: Tracer.AnySpan | undefined): unknown => {
  if (span?._tag !== "Span") return undefined
  if (span.name === "Engine.execute") return span.attributes.get("rule.id")
  return executingRule(Option.getOrUndefined(span.parent))
}

const endedWithFailure = (span: Tracer.NativeSpan) => span.status._tag === "Ended" && Exit.isFailure(span.status.exit)

const expense = (name: string, options: {
  readonly condition?: { readonly field: string; readonly op: string; readonly value: unknown }
  readonly path?: string
}) => ({
  name,
  trigger: { type: "event", event: "expense" },
  ...(options.condition ? { condition: options.condition } : {}),
  action: { type: "appendFile", path: options.path ?? "alerts.log", message: name }
})

// Stores the rules, submits one event and returns what the run log holds.
const handle = (rules: ReadonlyArray<unknown>, event: { readonly type: string; readonly [field: string]: unknown }) =>
  Effect.gen(function*() {
    const store = yield* RuleStore
    const stored = yield* Effect.forEach(rules, (rule) => store.create(Schema.decodeUnknownSync(Rule)(rule)))
    const outcomes = yield* (yield* Engine).handleEvent(event)
    const runs = yield* (yield* RunLog).list()
    return { ids: stored.map((rule) => rule.id), outcomes, runs }
  })

const laptop = { type: "expense", amount: 1200, description: "laptop" }

describe("Engine.handleEvent", () => {
  it.effect("records one run per matching rule: succeeded with one appended line, or skipped", () => {
    const test = setup()
    return Effect.gen(function*() {
      const { ids: [large, huge], runs } = yield* handle([
        expense("large expense", { condition: { field: "amount", op: "gt", value: 500 } }),
        expense("huge expense", { condition: { field: "amount", op: "gt", value: 5000 } }),
        { ...expense("payday", {}), trigger: { type: "event", event: "payday" } },
        { ...expense("poll", {}), trigger: { type: "interval", everySeconds: 5, url: "http://localhost:4600/ok" } }
      ], laptop)
      assert.deepStrictEqual(
        runs.map((run) => [run.ruleId, run.trigger, run.outcome]).toSorted(),
        [[large, "event", "succeeded"], [huge, "event", "skipped"]].toSorted()
      )
      const row = (id: string) => runs.find((run) => run.ruleId === id)!
      assert.isNull(row(large).reason, "a succeeded row has no reason")
      assert.isString(row(huge).reason, "a skipped row says why")
      assert.isNotEmpty(row(huge).reason)
      assert.strictEqual(test.writes.length, 1)
      const [write] = test.writes
      assert.strictEqual(write.path, "alerts.log")
      assert.strictEqual(write.flag, "a")
      assert.match(write.data, /^[^\n]+\n$/)
    }).pipe(test.provide)
  })

  it.effect("opens the run row before the action and finalises it exactly once", () => {
    const test = setup()
    return Effect.gen(function*() {
      const { ids: [id], runs: [run] } = yield* handle([expense("every expense", {})], laptop)
      assert.deepStrictEqual(test.rowsAtWrite.map((rows) => rows.map((row) => [row.ruleId, row.outcome])), [
        [[id, "started"]]
      ])
      assert.strictEqual(run.outcome, "succeeded")
      assert.deepStrictEqual(test.finished, [run.id])
    }).pipe(test.provide)
  })

  it.effect("a missing field is skipped with a reason in the run history, not failed", () => {
    const test = setup()
    return Effect.gen(function*() {
      const { ids: [id], outcomes, runs } = yield* handle([
        expense("large expense", { condition: { field: "amount", op: "gt", value: 500 } })
      ], { type: "expense", description: "no amount" })
      assert.deepStrictEqual(runs.map((run) => [run.ruleId, run.outcome]), [[id, "skipped"]])
      assert.match(String(runs[0].reason), /amount/, "the stored row names the missing field")
      assert.isNull(runs[0].error, "a skip is not an error")
      assert.strictEqual(outcomes.length, 1)
      const [outcome] = outcomes
      assert.strictEqual(outcome.ruleId, id)
      assert.strictEqual(outcome.outcome, "skipped")
      assert.match(String(outcome.reason), /amount/)
      assert.strictEqual(test.writes.length, 0)
    }).pipe(test.provide)
  })

  it.effect("a FileSystem error is failed with reason io, finalised once, and ends its span as a failure", () => {
    const test = setup()
    return Effect.gen(function*() {
      const { ids: [id], runs } = yield* handle([expense("denied", { path: "/denied/alerts.log" })], laptop)
      assert.deepStrictEqual(runs.map((run) => [run.ruleId, run.outcome, run.reason]), [[id, "failed", "io"]])
      assert.deepStrictEqual(test.finished, runs.map((run) => run.id))
      assert.deepStrictEqual(test.executingAtWrite, [id], "the failing write runs inside the rule's span")
      const executions = test.spans.filter((span) => span.name === "Engine.execute")
      assert.deepStrictEqual(executions.map(endedWithFailure), [true])
    }).pipe(test.provide)
  })

  it.effect("runs each rule's action inside a span named Engine.execute annotated with the rule id and trigger", () => {
    const test = setup()
    return Effect.gen(function*() {
      const { ids } = yield* handle([expense("first", {}), expense("second", {})], laptop)
      const executions = test.spans.filter((span) => span.name === "Engine.execute")
      assert.deepStrictEqual(executions.map((span) => span.attributes.get("rule.id")).toSorted(), ids.toSorted())
      assert.deepStrictEqual(executions.map((span) => span.attributes.get("rule.trigger")), ["event", "event"])
      assert.deepStrictEqual(test.executingAtWrite.toSorted(), ids.toSorted())
      assert.deepStrictEqual(executions.map(endedWithFailure), [false, false])
    }).pipe(test.provide)
  })
})
