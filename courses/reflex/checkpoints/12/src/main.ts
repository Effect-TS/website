// Stores three rules, submits two events to the Engine and prints the run log.
//
//   pnpm checkpoint 12
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Layer, Schema } from "effect"
import { Engine } from "./Engine.ts"
import { Event, Rule } from "./Rule.ts"
import { RuleStore } from "./RuleStore.ts"
import { RunLog } from "./RunLog.ts"

const ruleFiles = [
  "fixtures/rules/expense.json",
  "fixtures/rules/huge-expense.json",
  "fixtures/rules/every-expense.json"
]
const eventFiles = ["fixtures/events/laptop.json", "fixtures/events/lunch.json"]

const readJson = Effect.fn("readJson")(function*<S extends Schema.Top>(schema: S, path: string) {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs.readFileString(path)
  return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(text)
})

const program = Effect.gen(function*() {
  const store = yield* RuleStore
  const engine = yield* Engine
  const names = new Map<string, string>()
  for (const file of ruleFiles) {
    const rule = yield* store.create(yield* readJson(Rule, file))
    names.set(rule.id, rule.name)
  }
  for (const file of eventFiles) {
    yield* engine.handleEvent(yield* readJson(Event, file))
  }
  for (const run of (yield* (yield* RunLog).list()).toReversed()) {
    yield* Console.log(`${names.get(run.ruleId)}: ${run.outcome}${run.reason === null ? "" : ` (${run.reason})`}`)
  }
})

const layer = Engine.layer.pipe(
  Layer.provideMerge(RuleStore.layerMemory),
  Layer.provideMerge(RunLog.layerMemory),
  Layer.provideMerge(NodeServices.layer)
)

program.pipe(
  Effect.tapError((error) => Console.error(`${error._tag}: ${error.message}`)),
  Effect.provide(layer),
  NodeRuntime.runMain({ disableErrorReporting: true })
)
