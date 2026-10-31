// Runs the reference solution of a local lesson. You never edit it.
//
//   pnpm checkpoint 11 fixtures/rules/expense.json fixtures/events/laptop.json
//   pnpm checkpoint 14 server             the checkpoint's server
//   pnpm checkpoint 15 cli rules list     the checkpoint's CLI
//   pnpm checkpoint 13 test               the checkpoint's tests
//
// Without `server`, `cli` or `test`, it runs the checkpoint's program:
// src/main.ts, src/run-once.ts or src/server/main.ts, the first that exists.
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Path, Runtime, Schema } from "effect"
import { isMain, runFile, runInherited } from "./entrypoint.ts"

export class CheckpointError extends Schema.TaggedError<CheckpointError>()("CheckpointError", {
  message: Schema.String
}) {
  override readonly [Runtime.errorReported] = false
}

const programs = ["src/main.ts", "src/run-once.ts", "src/server/main.ts"]

// Arguments after the lesson number go to the program untouched, flags
// included, so they are not parsed here.
const Lesson = Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 11, maximum: 24 }))

export const checkpoint = Effect.fn("checkpoint")(function*(lesson: number, args: ReadonlyArray<string>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const rootPath = path.join(import.meta.dirname, "..")
  const directory = path.join(rootPath, "checkpoints", String(lesson).padStart(2, "0"))
  if (!(yield* fs.exists(directory))) {
    const available = (yield* fs.readDirectory(path.join(rootPath, "checkpoints")).pipe(
      Effect.orElseSucceed((): Array<string> => [])
    )).toSorted()
    return yield* new CheckpointError({
      message: `No checkpoint for lesson ${lesson}. Available: ${available.join(", ") || "none yet"}`
    })
  }

  const [first, ...rest] = args
  if (first === "test") {
    return yield* runInherited(process.execPath, [
      path.join(rootPath, "node_modules", "vitest", "vitest.mjs"),
      "run",
      path.relative(rootPath, directory),
      ...rest
    ])
  }
  const candidates = first === "server" || first === "cli"
    ? [{ file: `src/${first}/main.ts`, args: rest }]
    : programs.map((file) => ({ file, args }))
  for (const candidate of candidates) {
    const file = path.join(directory, candidate.file)
    if (yield* fs.exists(file)) {
      return yield* runFile(file, candidate.args)
    }
  }
  return yield* new CheckpointError({
    message: `Checkpoint ${lesson} has none of ${candidates.map((_) => _.file).join(", ")}`
  })
})

if (isMain(import.meta)) {
  const [lesson = "", ...args] = process.argv.slice(2)
  Schema.decodeEffect(Lesson)(lesson).pipe(
    Effect.mapError(() =>
      new CheckpointError({ message: "Usage: pnpm checkpoint <11-24> [server|cli|test] [args...]" })
    ),
    Effect.flatMap((lesson) => checkpoint(lesson, args)),
    Effect.tapErrorTag("CheckpointError", (error) => Console.error(error.message)),
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
