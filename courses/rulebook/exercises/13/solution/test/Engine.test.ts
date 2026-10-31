import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem, Layer, Schema } from "effect"
import { Engine } from "../src/Engine.ts"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"

// Every write the Engine makes lands here instead of on disk.
const writes: Array<string> = []

const FileSystemRecording = Layer.succeed(
  FileSystem.FileSystem,
  FileSystem.makeNoop({
    writeFileString: (path) => Effect.sync(() => writes.push(path)),
    writeFile: (path) => Effect.sync(() => writes.push(path))
  })
)

const TestLayer = Engine.layer.pipe(
  Layer.provideMerge(RuleStore.layerMemory),
  Layer.provideMerge(RunLog.layerMemory),
  Layer.provide(FileSystemRecording)
)

layer(TestLayer)("Engine", (it) => {
  it.effect("a missing field is skipped with a reason, not failed", () =>
    Effect.gen(function*() {
      const rule = yield* (yield* RuleStore).create(
        Schema.decodeUnknownSync(Rule)({
          name: "large expense",
          trigger: { type: "event", event: "expense" },
          condition: { field: "amount", op: "gt", value: 500 },
          action: { type: "appendFile", path: "alerts.log", message: "large expense" }
        })
      )

      yield* (yield* Engine).handleEvent({ type: "expense", description: "no amount" })

      const runs = yield* (yield* RunLog).list()
      assert.deepStrictEqual(runs.map((run) => [run.ruleId, run.outcome]), [[rule.id, "skipped"]])
      assert.match(String(runs[0].reason), /amount/, "the row names the missing field")
      assert.isNull(runs[0].error, "a skip is not an error")
      assert.deepStrictEqual(writes, [])
    }))
})
