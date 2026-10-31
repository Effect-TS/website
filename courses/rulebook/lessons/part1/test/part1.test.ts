import { NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Stream } from "effect"
import { ChildProcess } from "effect/process"
import * as NodePath from "node:path"
import { pathToFileURL } from "node:url"

// Every Part 1 lesson file runs here the way `pnpm lesson <n>` runs it, tsx in
// a child process, except that telemetryHooks.ts swaps the supplied
// Telemetry.ts for TelemetryStub.ts: nothing is exported, and each log is one
// stdout line naming its span. An alert line is a line that names the Part 1
// event, as lesson 2's "expense 1200 over 500" does.

const root = NodePath.join(import.meta.dirname, "..", "..", "..")
const part1 = NodePath.join(root, "lessons", "part1")
const tsc = NodePath.join(root, "node_modules", "typescript", "bin", "tsc")
const telemetryHooks = pathToFileURL(NodePath.join(import.meta.dirname, "telemetryHooks.ts")).href

const timeout = 60_000

// The end of lesson 8 is one lesson state stored at two paths. It is the only
// state in lessons/part1/ that must not typecheck.
const lesson8End = ["08-*/solution", "09-*/start"]

const lessonDirectory = Effect.fn("lessonDirectory")(function*(lesson: number) {
  const fs = yield* FileSystem.FileSystem
  const prefix = String(lesson).padStart(2, "0")
  const entries = yield* fs.readDirectory(part1).pipe(Effect.orElseSucceed((): Array<string> => []))
  const directory = entries.find((entry) => entry.startsWith(`${prefix}-`))
  assert.isDefined(directory, `lessons/part1/${prefix}-*/ exists`)
  return NodePath.join(part1, directory!)
})

const lessonFile = (lesson: number, variant: "start" | "solution") =>
  Effect.map(lessonDirectory(lesson), (directory) => NodePath.join(directory, variant, "main.ts"))

const collect = (stream: Stream.Stream<Uint8Array, unknown>) => stream.pipe(Stream.decodeText, Stream.mkString)

const run = Effect.fn("run")(function*(file: string) {
  const handle = yield* ChildProcess.make(process.execPath, ["--import", "tsx", "--import", telemetryHooks, file], {
    cwd: root
  })
  const [stdout, stderr, exitCode] = yield* Effect.all([
    collect(handle.stdout),
    collect(handle.stderr),
    handle.exitCode
  ], { concurrency: "unbounded" })
  return { stdout: stdout.replace(/\x1b\[[0-9;]*m/g, ""), stderr, exitCode: Number(exitCode) }
}, Effect.scoped)

const runLesson = (lesson: number, variant: "start" | "solution") => Effect.flatMap(lessonFile(lesson, variant), run)

// Typechecks with the course's compiler options, through a tsconfig that
// extends the course tsconfig.json and only replaces what it covers.
const typecheck = Effect.fn("typecheck")(function*(options: {
  readonly include: ReadonlyArray<string>
  readonly exclude?: ReadonlyArray<string>
}) {
  const fs = yield* FileSystem.FileSystem
  const directory = yield* fs.makeTempDirectoryScoped({ directory: root, prefix: ".tsc-" })
  const relative = (pattern: string) => NodePath.relative(directory, NodePath.join(part1, pattern))
  yield* fs.writeFileString(
    NodePath.join(directory, "tsconfig.json"),
    JSON.stringify({
      extends: NodePath.relative(directory, NodePath.join(root, "tsconfig.json")),
      include: options.include.map(relative),
      exclude: (options.exclude ?? []).map(relative)
    })
  )
  const handle = yield* ChildProcess.make(process.execPath, [tsc, "-p", directory, "--pretty", "false"], {
    cwd: root
  })
  const [output, exitCode] = yield* Effect.all([collect(handle.all), handle.exitCode], { concurrency: "unbounded" })
  return { output, exitCode: Number(exitCode) }
}, Effect.scoped)

const count = (output: string, text: string) => output.split("\n").filter((line) => line.includes(text)).length

const alertLines = (output: string) =>
  output.split("\n").flatMap((line) => {
    const index = line.indexOf("expense 1200")
    return index === -1 ? [] : [line.slice(index).trimEnd()]
  })

// What varies between two runs of the same program: clock times, durations,
// fiber ids, and the path of the file that ran.
const normalize = (output: string) =>
  output
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, "<time>")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, "<time>")
    .replace(/\b\d+(\.\d+)?ms\b/g, "<ms>")
    .replace(/#\d+/g, "#")
    .replace(/lessons\/part1\/\d{2}-[^/]+\/(start|solution)\/main\.ts(:\d+:\d+)?/g, "<lesson>")

const report = (result: { readonly stdout: string; readonly stderr: string }) =>
  `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`

describe("Part 1 lesson files", () => {
  it.effect("lessons 2 to 10 have a start and a solution; lesson 1 is the lesson 10 file", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      for (let lesson = 1; lesson <= 10; lesson++) {
        const directory = yield* lessonDirectory(lesson)
        assert.isTrue(yield* fs.exists(NodePath.join(directory, "solution", "main.ts")), `${directory}/solution`)
        assert.strictEqual(
          yield* fs.exists(NodePath.join(directory, "start", "main.ts")),
          lesson !== 1,
          `${directory}/start`
        )
      }
      assert.strictEqual(
        yield* fs.readFileString(yield* lessonFile(1, "solution")),
        yield* fs.readFileString(yield* lessonFile(10, "solution"))
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  describe.concurrent("typecheck", () => {
    it.live("every file except the lesson 8 end state typechecks", () =>
      Effect.gen(function*() {
        for (let lesson = 1; lesson <= 10; lesson++) yield* lessonDirectory(lesson)
        const result = yield* typecheck({ include: ["**/*.ts"], exclude: lesson8End })
        assert.strictEqual(result.exitCode, 0, result.output)
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.effect("the lesson 8 end state is stored twice with the same content", () =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        assert.strictEqual(
          yield* fs.readFileString(yield* lessonFile(8, "solution")),
          yield* fs.readFileString(yield* lessonFile(9, "start"))
        )
      }).pipe(Effect.provide(NodeServices.layer)))

    for (const path of lesson8End) {
      it.live(`${path}/main.ts fails to typecheck naming RuleStore`, () =>
        Effect.gen(function*() {
          const [prefix, variant] = path.split("-*/") as [string, "start" | "solution"]
          const file = yield* lessonFile(Number(prefix), variant)
          const result = yield* typecheck({ include: [NodePath.relative(part1, file)] })
          assert.notStrictEqual(result.exitCode, 0, result.output)
          assert.include(result.output, `${NodePath.relative(root, file)}(`, result.output)
          assert.match(result.output, /error TS\d+/, result.output)
          assert.match(result.output, /\bRuleStore\b/, result.output)
        }).pipe(Effect.provide(NodeServices.layer)), timeout)
    }
  })

  describe.concurrent("output", () => {
    it.live("02 runs the program twice and logs the line each time", () =>
      Effect.gen(function*() {
        const result = yield* runLesson(2, "solution")
        assert.strictEqual(result.exitCode, 0, report(result))
        assert.strictEqual(count(result.stdout, "expense 1200 over 500"), 2, report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live("03 builds the message in Effect.gen and logs it", () =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const file = yield* lessonFile(3, "solution")
        assert.include(yield* fs.readFileString(file), "Effect.gen")
        const result = yield* run(file)
        assert.strictEqual(result.exitCode, 0, report(result))
        assert.strictEqual(count(result.stdout, "expense 1200 over 500"), 1, report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live("04 fails with MissingField when amount is absent", () =>
      Effect.gen(function*() {
        const result = yield* runLesson(4, "solution")
        assert.notStrictEqual(result.exitCode, 0, report(result))
        assert.match(result.stdout, /\bMissingField\b/, report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live("05 skips on MissingField and still fails with UnknownOperator", () =>
      Effect.gen(function*() {
        const result = yield* runLesson(5, "solution")
        assert.notStrictEqual(result.exitCode, 0, report(result))
        assert.match(result.stdout, /\bskip/i, report(result))
        assert.match(result.stdout, /\bUnknownOperator\b/, report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live(
      "06 prints a schema error for the malformed rule and still alerts for the valid one",
      () =>
        Effect.gen(function*() {
          const result = yield* runLesson(6, "solution")
          assert.match(result.stdout, /SchemaError|\bExpected\b/, report(result))
          assert.isAtLeast(count(result.stdout, "expense 1200 over 500"), 1, report(result))
        }).pipe(Effect.provide(NodeServices.layer)),
      timeout
    )

    it.live("07 log lines carry the evaluate span name", () =>
      Effect.gen(function*() {
        const result = yield* runLesson(7, "solution")
        // The span field of a TelemetryStub.ts line, not `at evaluate` in a
        // failure's stack trace.
        assert.match(result.stdout, /^[A-Z]+ \[evaluate\] /m, report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live("08 start is the lesson 7 end state and prints the same lines as 07", () =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const start = yield* lessonFile(8, "start")
        assert.notInclude(yield* fs.readFileString(start), "RuleStore")
        const [lesson7, lesson8] = yield* Effect.all([runLesson(7, "solution"), run(start)], {
          concurrency: "unbounded"
        })
        assert.strictEqual(lesson8.exitCode, lesson7.exitCode, report(lesson8))
        assert.strictEqual(normalize(lesson8.stdout), normalize(lesson7.stdout))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live("09 provides the store and alerts once for each of the three fixture rules", () =>
      Effect.gen(function*() {
        const result = yield* runLesson(9, "solution")
        assert.strictEqual(result.exitCode, 0, report(result))
        assert.lengthOf(alertLines(result.stdout), 3, report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live("10 runs the full file and prints the same three lines as 09", () =>
      Effect.gen(function*() {
        const [lesson9, lesson10] = yield* Effect.all([runLesson(9, "solution"), runLesson(10, "solution")], {
          concurrency: "unbounded"
        })
        assert.strictEqual(lesson10.exitCode, 0, report(lesson10))
        assert.lengthOf(alertLines(lesson10.stdout), 3, report(lesson10))
        assert.deepStrictEqual(alertLines(lesson10.stdout), alertLines(lesson9.stdout))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)
  })
})
