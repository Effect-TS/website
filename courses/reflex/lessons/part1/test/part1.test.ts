import { NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Stream } from "effect"
import { ChildProcess } from "effect/process"
import * as NodePath from "node:path"

// Every Part 1 lesson file runs here the way `pnpm lesson <n>` runs it, tsx in
// a child process. Part 1 provides no layer for logging or tracing, so each log
// is a line from the default logger on stdout. An alert line is a line that
// names the Part 1 event, as lesson 2's "expense 1200 over 500" does.

const root = NodePath.join(import.meta.dirname, "..", "..", "..")
const part1 = NodePath.join(root, "lessons", "part1")
const tsc = NodePath.join(root, "node_modules", "typescript", "bin", "tsc")

const timeout = 60_000

// Lesson 9 introduces Effect.provide; every file before its solution runs the
// program as it is.
const beforeProvide = [
  ...[2, 3, 4, 5, 6, 7, 8].flatMap((lesson) => [[lesson, "start"], [lesson, "solution"]] as const),
  [9, "start"] as const
]

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
  const handle = yield* ChildProcess.make(process.execPath, ["--import", "tsx", file], {
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

const lineOf = (output: string, text: string) => output.split("\n").findIndex((line) => line.includes(text))

// Lessons 3 to 5 carry one small program: two expenses are reviewed in order
// and a summary of how many were flagged is logged after both verdicts.
const summary = "1 of 2 expenses flagged"

// A lesson's start is the previous lesson's end state.
const assertStartIsPrevious = Effect.fn("assertStartIsPrevious")(function*(lesson: number) {
  const fs = yield* FileSystem.FileSystem
  assert.strictEqual(
    yield* fs.readFileString(yield* lessonFile(lesson, "start")),
    yield* fs.readFileString(yield* lessonFile(lesson - 1, "solution")),
    `lesson ${lesson} start is the lesson ${lesson - 1} solution`
  )
})

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
  // The course opens on the /learn landing page; Part 1's first lesson is 2.
  it.effect("lessons 2 to 10 have a start and a solution, and no 01-* directory exists", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      for (let lesson = 2; lesson <= 10; lesson++) {
        const directory = yield* lessonDirectory(lesson)
        assert.isTrue(yield* fs.exists(NodePath.join(directory, "solution", "main.ts")), `${directory}/solution`)
        assert.isTrue(yield* fs.exists(NodePath.join(directory, "start", "main.ts")), `${directory}/start`)
      }
      const entries = yield* fs.readDirectory(part1)
      assert.deepStrictEqual(entries.filter((entry) => entry.startsWith("01-")), [], "lessons/part1/01-*/")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("lesson 11 opens with the lesson 10 file in src/run-once.ts", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      assert.strictEqual(
        yield* fs.readFileString(NodePath.join(root, "src", "run-once.ts")),
        yield* fs.readFileString(yield* lessonFile(10, "solution"))
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  // The field path, the optional condition and the other operators arrive with
  // the real Rule in lesson 11.
  it.effect("Part 1 rules are about amount only", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      for (let lesson = 2; lesson <= 10; lesson++) {
        for (const variant of ["start", "solution"] as const) {
          const file = yield* lessonFile(lesson, variant)
          const source = yield* fs.readFileString(file)
          assert.notMatch(source, /\bcondition\b/, NodePath.relative(root, file))
          assert.notMatch(source, /\bUnknownOperator\b/, NodePath.relative(root, file))
        }
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("no lesson file, nor the lesson 10 file that opens Part 2, uses a telemetry layer", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      assert.isFalse(yield* fs.exists(NodePath.join(part1, "Telemetry.ts")), "lessons/part1/Telemetry.ts")
      const files = [NodePath.join(root, "src", "run-once.ts")]
      for (let lesson = 2; lesson <= 10; lesson++) {
        files.push(yield* lessonFile(lesson, "start"), yield* lessonFile(lesson, "solution"))
      }
      for (const file of files) {
        assert.notMatch(yield* fs.readFileString(file), /Telemetry/, NodePath.relative(root, file))
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("no lesson file before lesson 9's solution calls Effect.provide", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      for (const [lesson, variant] of beforeProvide) {
        const file = yield* lessonFile(lesson, variant)
        assert.notMatch(yield* fs.readFileString(file), /\bEffect\.provide/, NodePath.relative(root, file))
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  describe.concurrent("typecheck", () => {
    it.live("every file except the lesson 8 end state typechecks", () =>
      Effect.gen(function*() {
        for (let lesson = 2; lesson <= 10; lesson++) yield* lessonDirectory(lesson)
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

    it.live(
      "03 reviews 1200 and 40 in order in Effect.gen, then logs how many were flagged, with no event or rule",
      () =>
        Effect.gen(function*() {
          const fs = yield* FileSystem.FileSystem
          yield* assertStartIsPrevious(3)
          const file = yield* lessonFile(3, "solution")
          const source = yield* fs.readFileString(file)
          assert.include(source, "Effect.gen")
          for (const later of [/\bEvent\b/, /\bRule\b/, /\bSchema\b/, /\binterface\b/]) {
            assert.notMatch(source, later)
          }
          const result = yield* run(file)
          assert.strictEqual(result.exitCode, 0, report(result))
          assert.strictEqual(count(result.stdout, "expense 1200 over 500"), 1, report(result))
          assert.strictEqual(count(result.stdout, "expense 40: no alert"), 1, report(result))
          assert.strictEqual(count(result.stdout, summary), 1, report(result))
          // The summary needs what both checks found, so it comes after them.
          const last = lineOf(result.stdout, summary)
          assert.isAbove(last, lineOf(result.stdout, "expense 1200 over 500"), report(result))
          assert.isAbove(last, lineOf(result.stdout, "expense 40: no alert"), report(result))
        }).pipe(Effect.provide(NodeServices.layer)),
      timeout
    )

    it.live("04 fails with MissingField when amount is absent, before the summary", () =>
      Effect.gen(function*() {
        yield* assertStartIsPrevious(4)
        const result = yield* runLesson(4, "solution")
        assert.notStrictEqual(result.exitCode, 0, report(result))
        assert.match(result.stdout, /\bMissingField\b/, report(result))
        assert.notInclude(result.stdout, "expenses flagged", report(result))
      }).pipe(Effect.provide(NodeServices.layer)), timeout)

    it.live(
      "05 alerts for laptop, skips taxi on MissingField, logs the summary and succeeds",
      () =>
        Effect.gen(function*() {
          const result = yield* runLesson(5, "solution")
          assert.strictEqual(result.exitCode, 0, report(result))
          assert.lengthOf(alertLines(result.stdout), 1, report(result))
          assert.strictEqual(count(result.stdout, "skip"), 1, report(result))
          assert.strictEqual(count(result.stdout, summary), 1, report(result))
          assert.notMatch(result.stdout, /\bUnknownOperator\b/, report(result))
        }).pipe(Effect.provide(NodeServices.layer)),
      timeout
    )

    it.live(
      "06 prints a schema error for the malformed rule and still alerts for the valid one",
      () =>
        Effect.gen(function*() {
          const fs = yield* FileSystem.FileSystem
          yield* assertStartIsPrevious(6)
          const file = yield* lessonFile(6, "solution")
          assert.include(yield* fs.readFileString(file), "Schema.Struct")
          const result = yield* run(file)
          assert.match(result.stdout, /SchemaError|\bExpected\b/, report(result))
          assert.isAtLeast(count(result.stdout, "expense 1200 over 500"), 1, report(result))
          assert.isAtLeast(count(result.stdout, "skip"), 1, report(result))
          // The broken rule fails the program before any summary.
          assert.notInclude(result.stdout, "expenses flagged", report(result))
        }).pipe(Effect.provide(NodeServices.layer)),
      timeout
    )

    it.live("07 the malformed rule's failure names the evaluate span", () =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const file = yield* lessonFile(7, "solution")
        assert.include(yield* fs.readFileString(file), `Effect.fn("evaluate")`)
        const result = yield* run(file)
        assert.notStrictEqual(result.exitCode, 0, report(result))
        assert.isAtLeast(count(result.stdout, "expense 1200 over 500"), 1, report(result))
        assert.isAtLeast(count(result.stdout, "skip"), 1, report(result))
        assert.match(result.stdout, /SchemaError/, report(result))
        // The name given to Effect.fn, in the trace runMain prints with the
        // failure.
        assert.match(result.stdout, /^\s+at evaluate \(/m, report(result))
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
