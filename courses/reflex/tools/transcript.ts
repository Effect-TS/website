// Captures the terminal session of the finished app that the /learn page shows
// into checkpoints/24/transcript.txt. Rerun it whenever checkpoint 24 changes.
//
//   pnpm transcript
//
// It starts the receiver and the checkpoint 24 server in a scratch directory,
// so the server gets an empty reflex.db and yours is left alone, runs the
// checkpoint 24 CLI against them, then stops both. Clock times, ids and
// durations become fixed placeholders, so a rerun only changes the file when
// the output does. Ports 3000 and 4600 must be free.
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Layer, Path, Schedule, Schema, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { ChildProcess } from "effect/process"
import * as NodePath from "node:path"
import { isMain, tsxArgs } from "./entrypoint.ts"

export class TranscriptError extends Schema.TaggedError<TranscriptError>()("TranscriptError", {
  message: Schema.String
}) {}

const root = NodePath.join(import.meta.dirname, "..")
const server = "http://localhost:3000"
const receiver = "http://localhost:4600"

// The interval rule polls once when it is added and then every 60 seconds, so
// the whole session fits between its first two ticks.
const eventRule = "fixtures/rules/post-ok.json"
const intervalRule = "fixtures/rules/status-check.json"
const event = "fixtures/events/laptop.json"

const Runs = Schema.Array(Schema.Struct({ ruleId: Schema.String, outcome: Schema.String }))

// A long-running program whose output is kept as it arrives. Returns once it
// has printed `Listening on`, with what it printed up to that line.
const start = Effect.fn("start")(function*(cwd: string, file: string) {
  let output = ""
  const handle = yield* ChildProcess.make(process.execPath, tsxArgs(file), { cwd })
  yield* handle.all.pipe(
    Stream.decodeText,
    Stream.runForEach((text) => Effect.sync(() => (output += text))),
    Effect.forkScoped
  )
  const listening = Effect.suspend(() => {
    const index = output.indexOf("Listening on")
    return index === -1
      ? Effect.fail("waiting" as const)
      : Effect.succeed(output.slice(0, output.indexOf("\n", index) + 1))
  })
  return yield* listening.pipe(
    Effect.retry(Schedule.spaced("100 millis")),
    Effect.raceFirst(
      handle.exitCode.pipe(
        Effect.flatMap((code) =>
          Effect.fail(new TranscriptError({ message: `${file} exited with ${code} before listening:\n${output}` }))
        )
      )
    ),
    Effect.timeoutOrElse({
      duration: "60 seconds",
      orElse: () => Effect.fail(new TranscriptError({ message: `${file} did not start listening:\n${output}` }))
    })
  )
})

// One CLI command, run to its end. A command that fails stops the capture.
const cli = Effect.fn("cli")(function*(cwd: string, args: ReadonlyArray<string>) {
  const handle = yield* ChildProcess.make(
    process.execPath,
    tsxArgs(NodePath.join(root, "checkpoints/24/src/cli/main.ts"), args),
    { cwd }
  )
  const [output, code] = yield* Effect.all([
    handle.all.pipe(Stream.decodeText, Stream.mkString),
    handle.exitCode
  ], { concurrency: "unbounded" })
  if (Number(code) !== 0) {
    return yield* new TranscriptError({ message: `cli ${args.join(" ")} exited with ${code}:\n${output}` })
  }
  return output
}, Effect.scoped)

const runs = Effect.fn("runs")(function*() {
  const response = yield* HttpClient.get(`${server}/runs`)
  return yield* HttpClientResponse.schemaBodyJson(Runs)(response)
})

// The session, as the lines a learner would see in three terminals.
const capture = Effect.fn("capture")(function*(cwd: string) {
  const lines: Array<string> = []
  const show = (command: string, output: string) => lines.push(`$ ${command}`, ...output.trimEnd().split("\n"))

  lines.push("# Terminal 1")
  show("pnpm receiver", yield* start(cwd, NodePath.join(root, "tools/receiver.ts")))
  lines.push("", "# Terminal 2")
  show("pnpm checkpoint 24 server", yield* start(cwd, NodePath.join(root, "checkpoints/24/src/server/main.ts")))
  lines.push("", "# Terminal 3")
  const run = Effect.fn("run")(function*(...args: ReadonlyArray<string>) {
    const output = yield* cli(cwd, args)
    show(`pnpm checkpoint 24 cli ${args.join(" ")}`, output)
    return output
  })
  const added = (output: string) => output.match(/^Added (\S+):/)![1]!

  yield* run("rules", "add", eventRule)
  const interval = added(yield* run("rules", "add", intervalRule))
  // The interval rule's first poll starts as it is added; let it finish so its
  // row comes before the event's.
  yield* runs().pipe(
    Effect.filterOrFail((rows) => rows.some((row) => row.ruleId === interval && row.outcome !== "started")),
    Effect.retry(Schedule.spaced("100 millis")),
    Effect.timeout("30 seconds")
  )
  yield* run("rules", "list")
  yield* run("events", "submit", event)

  const mode = JSON.stringify({ mode: "error" })
  const switched = yield* HttpClientRequest.post(`${receiver}/status/mode`).pipe(
    HttpClientRequest.bodyText(mode, "application/json"),
    HttpClient.execute,
    Effect.flatMap((response) => response.text)
  )
  show(`curl -X POST ${receiver.slice("http://".length)}/status/mode -d '${mode}'`, switched)

  yield* run("rules", "run", interval, "--event", event)
  yield* run("runs", "list")

  const outcomes = (yield* runs()).map((row) => row.outcome).toSorted()
  if (outcomes.join() !== "failed,skipped,succeeded") {
    return yield* new TranscriptError({
      message: `expected one failed, one skipped and one succeeded run, got ${outcomes.join(", ")}`
    })
  }
  return lines
})

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

// Rule ids become <rule-1>, <rule-2> in the order they were added, other ids
// <run-1>, ... in the order they appear; clock times, fiber numbers and
// millisecond durations become fixed placeholders.
export const normalize = (lines: ReadonlyArray<string>): Array<string> => {
  const text = lines.join("\n")
  const names = new Map<string, string>()
  for (const [, id] of text.matchAll(/^Added (\S+):/gm)) names.set(id!, `<rule-${names.size + 1}>`)
  let runCount = 0
  return text
    .replace(uuid, (id) => {
      if (!names.has(id)) names.set(id, `<run-${++runCount}>`)
      return names.get(id)!
    })
    .replace(/\b\d{2}:\d{2}:\d{2}\.\d{3}\b/g, "hh:mm:ss.sss")
    .replace(/#\d+\b/g, "#n")
    .replace(/\b\d+(\.\d+)?ms\b/g, "<n>ms")
    .split("\n")
}

export const transcript = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  // A scratch working directory: reflex.db and alerts.log land here, while
  // the fixtures and node_modules are the starter's own.
  const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "reflex-transcript-" })
  yield* fs.symlink(path.join(root, "node_modules"), path.join(cwd, "node_modules"))
  yield* fs.symlink(path.join(root, "fixtures"), path.join(cwd, "fixtures"))

  const lines = yield* capture(cwd)
  const file = path.join(root, "checkpoints", "24", "transcript.txt")
  yield* fs.writeFileString(
    file,
    [
      "# Captured from checkpoint 24 by `pnpm transcript`; rerun it when checkpoint 24 changes.",
      "",
      ...normalize(lines),
      ""
    ].join("\n")
  )
  yield* Console.log(`Wrote ${path.relative(root, file)}`)
}).pipe(Effect.scoped)

if (isMain(import.meta)) {
  transcript.pipe(
    Effect.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    NodeRuntime.runMain
  )
}
