// Runs one rule against one event and appends the alert line to the rule's
// file when the rule matches.
//
//   pnpm checkpoint 11 fixtures/rules/expense.json fixtures/events/laptop.json
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Schema } from "effect"
import { appendLine } from "./Action.ts"
import { alertLine, evaluate, Event, Rule } from "./Rule.ts"

const readJson = Effect.fn("readJson")(function*<S extends Schema.Top>(schema: S, path: string) {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs.readFileString(path)
  return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(text)
})

const program = Effect.gen(function*() {
  const [rulePath = "fixtures/rules/expense.json", eventPath = "fixtures/events/laptop.json"] = process.argv.slice(2)
  const rule = yield* readJson(Rule, rulePath)
  const event = yield* readJson(Event, eventPath)
  // A missing field means the rule does not apply to this event.
  const matched = yield* evaluate(rule, event).pipe(Effect.catchTag("MissingField", () => Effect.succeed(false)))
  if (!matched) {
    return yield* Effect.log(`${rule.name}: no match`)
  }
  switch (rule.action.type) {
    case "appendFile": {
      const line = yield* alertLine(rule, event)
      yield* appendLine(rule.action.path, line)
      return yield* Effect.log(`${rule.name}: appended "${line}" to ${rule.action.path}`)
    }
    case "httpPost":
      return yield* Effect.log(`${rule.name}: httpPost arrives in lesson 20`)
  }
})

// A typed error is printed as its tag and message, and the process exits with
// code 1. Defects still get the full report.
program.pipe(
  Effect.tapError((error) => Console.error(`${error._tag}: ${error.message}`)),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain({ disableErrorReporting: true })
)
