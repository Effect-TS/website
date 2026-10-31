// The rulebook command line. The commands, arguments and flags are declared
// for you; every handler body is empty until lesson 15, where you write them
// against the ApiClient.
//
//   pnpm cli rules add fixtures/rules/expense.json
//   pnpm cli rules list
//   pnpm cli rules remove <id>
//   pnpm cli rules run <id> --event fixtures/events/laptop.json
//   pnpm cli events submit fixtures/events/laptop.json
//   pnpm cli runs list --rule <id> --limit 10
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Effect } from "effect"
import { Argument, Command, Flag } from "effect/cli"
import { isMain } from "../../tools/entrypoint.ts"

const rulesAdd = Command.make(
  "add",
  { file: Argument.File("file").pipe(Argument.withDescription("Rule file (JSON)")) },
  // Lesson 15: decode the file and create the rule through the ApiClient.
  Effect.fn(function*({ file: _file }) {})
).pipe(Command.withDescription("Add a rule from a JSON file"))

const rulesList = Command.make(
  "list",
  {},
  // Lesson 15: print each rule, and from lesson 19 whether its loop is running.
  Effect.fn(function*() {})
).pipe(Command.withDescription("List rules"))

const rulesRemove = Command.make(
  "remove",
  { id: Argument.String("id").pipe(Argument.withDescription("Rule id")) },
  // Lesson 15: remove the rule through the ApiClient.
  Effect.fn(function*({ id: _id }) {})
).pipe(Command.withDescription("Remove a rule"))

const rulesRun = Command.make(
  "run",
  {
    id: Argument.String("id").pipe(Argument.withDescription("Rule id")),
    event: Flag.File("event").pipe(Flag.withDescription("Event file (JSON) to run the rule against"))
  },
  // Lesson 15: run one rule against the event and print the outcome.
  Effect.fn(function*({ id: _id, event: _event }) {})
).pipe(Command.withDescription("Run one rule against an event"))

const rules = Command.make("rules").pipe(
  Command.withDescription("Manage rules"),
  Command.withSubcommands([rulesAdd, rulesList, rulesRemove, rulesRun])
)

const eventsSubmit = Command.make(
  "submit",
  { file: Argument.File("file").pipe(Argument.withDescription("Event file (JSON)")) },
  // Lesson 15: submit the event and print one outcome per rule.
  Effect.fn(function*({ file: _file }) {})
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
  // Lesson 15: list runs, newest first.
  Effect.fn(function*({ rule: _rule, limit: _limit }) {})
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
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
