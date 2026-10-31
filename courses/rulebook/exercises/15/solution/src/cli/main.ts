// The rulebook command line. Every handler talks to the server through the
// ApiClient; start the server first with `pnpm dev:server`.
//
//   pnpm cli rules add fixtures/rules/expense.json
//   pnpm cli rules list
//   pnpm cli rules remove <id>
//   pnpm cli rules run <id> --event fixtures/events/laptop.json
//   pnpm cli events submit fixtures/events/laptop.json
//   pnpm cli runs list --rule <id> --limit 10
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Layer, Option, Schema } from "effect"
import { Argument, Command, Flag } from "effect/cli"
import { FetchHttpClient } from "effect/http"
import { ExitCode, isMain } from "../../tools/entrypoint.ts"
import { ApiClient } from "../ApiClient.ts"
import type { Outcome } from "../Engine.ts"
import { Event, Rule } from "../Rule.ts"
import type { RuleNotFound } from "../RuleStore.ts"

const readJson = Effect.fn("readJson")(function*<S extends Schema.Top>(schema: S, path: string) {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs.readFileString(path)
  return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(text)
})

// An outcome with its reason or error, as in `skipped (missing field amount)`.
const describe = (row: { readonly outcome: string; readonly reason: string | null; readonly error: string | null }) =>
  `${row.outcome}${row.reason === null ? "" : ` (${row.reason})`}${row.error === null ? "" : `: ${row.error}`}`

const printOutcome = (outcome: Outcome) => Console.log(`${outcome.ruleId}: ${describe(outcome)}`)

// Prints one line and still fails, quietly, so the shell sees a non-zero exit.
const notFound = Effect.fn("notFound")(function*(error: RuleNotFound) {
  yield* Console.error(`No rule with id ${error.id}`)
  return yield* new ExitCode({ code: 1 })
})

const rulesAdd = Command.make(
  "add",
  { file: Argument.File("file").pipe(Argument.withDescription("Rule file (JSON)")) },
  Effect.fn("rules.add")(function*({ file }) {
    const client = yield* ApiClient
    const rule = yield* client.rules.create({ payload: yield* readJson(Rule, file) })
    yield* Console.log(`Added ${rule.id}: ${rule.name}`)
  })
).pipe(Command.withDescription("Add a rule from a JSON file"))

const rulesList = Command.make(
  "list",
  {},
  Effect.fn("rules.list")(function*() {
    const client = yield* ApiClient
    for (const rule of yield* client.rules.list()) {
      yield* Console.log(`${rule.id}  ${rule.name}`)
    }
  })
).pipe(Command.withDescription("List rules"))

const rulesRemove = Command.make(
  "remove",
  { id: Argument.String("id").pipe(Argument.withDescription("Rule id")) },
  Effect.fn("rules.remove")(function*({ id }) {
    const client = yield* ApiClient
    yield* client.rules.remove({ params: { id } })
    yield* Console.log(`Removed ${id}`)
  }, Effect.catchTag("RuleNotFound", notFound))
).pipe(Command.withDescription("Remove a rule"))

const rulesRun = Command.make(
  "run",
  {
    id: Argument.String("id").pipe(Argument.withDescription("Rule id")),
    event: Flag.File("event").pipe(Flag.withDescription("Event file (JSON) to run the rule against"))
  },
  Effect.fn("rules.run")(function*({ id, event }) {
    const client = yield* ApiClient
    yield* printOutcome(yield* client.rules.run({ params: { id }, payload: yield* readJson(Event, event) }))
  }, Effect.catchTag("RuleNotFound", notFound))
).pipe(Command.withDescription("Run one rule against an event"))

const rules = Command.make("rules").pipe(
  Command.withDescription("Manage rules"),
  Command.withSubcommands([rulesAdd, rulesList, rulesRemove, rulesRun])
)

const eventsSubmit = Command.make(
  "submit",
  { file: Argument.File("file").pipe(Argument.withDescription("Event file (JSON)")) },
  Effect.fn("events.submit")(function*({ file }) {
    const client = yield* ApiClient
    for (const outcome of yield* client.events.submit({ payload: yield* readJson(Event, file) })) {
      yield* printOutcome(outcome)
    }
  })
).pipe(Command.withDescription("Submit an event to every matching rule"))

const events = Command.make("events").pipe(
  Command.withDescription("Submit events"),
  Command.withSubcommands([eventsSubmit])
)

const runsList = Command.make(
  "list",
  {
    rule: Flag.String("rule").pipe(Flag.withDescription("Only runs of this rule id"), Flag.optional),
    limit: Flag.Int("limit").pipe(Flag.withDescription("At most this many runs"), Flag.optional)
  },
  Effect.fn("runs.list")(function*({ rule, limit }) {
    const client = yield* ApiClient
    const runs = yield* client.runs.list({
      query: { ruleId: Option.getOrUndefined(rule), limit: Option.getOrUndefined(limit) }
    })
    for (const run of runs) {
      yield* Console.log(`${run.id}  ${run.ruleId}  ${describe(run)}`)
    }
  })
).pipe(Command.withDescription("List runs"))

const runs = Command.make("runs").pipe(
  Command.withDescription("Inspect runs"),
  Command.withSubcommands([runsList])
)

export const cli = Command.make("rulebook").pipe(
  Command.withDescription("Personal automation rules"),
  Command.withSubcommands([rules, events, runs])
)

if (isMain(import.meta)) {
  cli.pipe(
    Command.run({ version: "0.0.0" }),
    Effect.provide(ApiClient.layer.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.merge(NodeServices.layer)
    )),
    NodeRuntime.runMain
  )
}
