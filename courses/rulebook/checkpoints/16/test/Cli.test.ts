import { NodeServices } from "@effect/platform-node"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem, Layer, Schema } from "effect"
import { Command } from "effect/cli"
import { TestConsole } from "effect/testing"
import * as NodePath from "node:path"
import { ApiClient } from "../src/ApiClient.ts"
import { cli } from "../src/cli/main.ts"
import { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"
import { layerServer } from "./support.ts"

const fixture = (path: string) => NodePath.join(import.meta.dirname, "../../../fixtures", path)

const printed = Effect.map(
  Effect.all([TestConsole.logLines, TestConsole.errorLines]),
  (lines) => lines.flat().map(String)
)

// The lines an effect printed, to stdout or stderr.
const printing = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function*() {
    const before = (yield* printed).length
    yield* effect
    return (yield* printed).slice(before)
  })

const command = Command.runWith(cli, { version: "0.0.0" })
const run = (...args: ReadonlyArray<string>) => printing(command(args))

const store = (file: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const rule = Schema.decodeUnknownSync(Schema.fromJsonString(Rule))(yield* fs.readFileString(fixture(file)))
    return yield* (yield* RuleStore).create(rule)
  })

// The CLI talks to the API through the ApiClient, whose HttpClient hands every
// request to the server in memory.
const layerCli = ApiClient.layer.pipe(
  Layer.provideMerge(layerServer),
  Layer.merge(NodeServices.layer),
  Layer.merge(TestConsole.layer)
)

layer(layerCli, { buildPerTest: true })("CLI", (it) => {
  it.effect("rules add posts the decoded file; list and remove; an unknown id is printed as one line", () =>
    Effect.gen(function*() {
      const rules = yield* RuleStore
      const added = yield* run("rules", "add", fixture("rules/expense.json"))
      const [stored] = yield* rules.list
      const { id, ...definition } = stored
      const fs = yield* FileSystem.FileSystem
      assert.deepStrictEqual(
        definition,
        Schema.decodeUnknownSync(Schema.fromJsonString(Rule))(yield* fs.readFileString(fixture("rules/expense.json")))
      )
      assert.isTrue(added.some((line) => line.includes(id)), "rules add prints the new id")

      const listed = yield* run("rules", "list")
      assert.isTrue(listed.some((line) => line.includes(id) && line.includes("large expense")))

      yield* run("rules", "remove", id)
      assert.deepStrictEqual(yield* rules.list, [])
      const missing = yield* printing(Effect.exit(command(["rules", "remove", id])))
      assert.strictEqual(missing.length, 1, missing.join("\n"))
      assert.include(missing[0], id)
    }))

  it.effect("events submit and rules run print outcomes; runs list sends --rule and --limit", () =>
    Effect.gen(function*() {
      const large = yield* store("rules/expense.json")
      const huge = yield* store("rules/huge-expense.json")
      const runLog = yield* RunLog

      const submitted = yield* run("events", "submit", fixture("events/laptop.json"))
      assert.strictEqual(submitted.filter((line) => line.includes("succeeded")).length, 1)
      assert.strictEqual(submitted.filter((line) => line.includes("skipped")).length, 1)
      assert.strictEqual((yield* runLog.list()).length, 2)

      const ran = yield* run("rules", "run", large.id, "--event", fixture("events/laptop.json"))
      assert.isTrue(ran.some((line) => line.includes("succeeded")))
      // The newest run belongs to the other rule, so ignoring --rule or
      // --limit each prints a row that must not be there.
      yield* run("rules", "run", huge.id, "--event", fixture("events/laptop.json"))
      const all = yield* runLog.list()
      assert.strictEqual(all.length, 4)
      assert.strictEqual(all[0].ruleId, huge.id)

      const [newest, older] = all.filter((row) => row.ruleId === large.id)
      const listed = (yield* run("runs", "list", "--rule", large.id, "--limit", "1")).join("\n")
      assert.include(listed, newest.id)
      assert.notInclude(listed, older.id)
      for (const row of all.filter((row) => row.ruleId === huge.id)) {
        assert.notInclude(listed, row.id)
      }
    }))

  // Lesson 15: an action the engine does not have yet is skipped with a reason,
  // through the same Engine.execute as every other run.
  it.effect("rules run on an httpPost rule prints a skipped outcome whose reason the run row carries", () =>
    Effect.gen(function*() {
      const phone = yield* store("rules/ntfy.json")
      const ran = (yield* run("rules", "run", phone.id, "--event", fixture("events/laptop.json"))).join("\n")
      const [row] = yield* (yield* RunLog).list({ ruleId: phone.id })
      assert.strictEqual(row.outcome, "skipped")
      assert.match(String(row.reason), /httpPost/)
      assert.match(String(row.reason), /20/)
      assert.include(ran, "skipped")
      assert.include(ran, row.reason!)
      assert.include((yield* run("runs", "list", "--rule", phone.id)).join("\n"), row.reason!)
    }))
})
