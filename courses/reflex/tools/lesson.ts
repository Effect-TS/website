// Runs a Part 1 lesson file in the local track. You never edit it.
//
//   pnpm lesson 3              lessons/part1/03-*/start/main.ts
//   pnpm lesson 3 --solution   lessons/part1/03-*/solution/main.ts
//
// Lessons 11 to 24 are written in src/; their reference solutions run with
// `pnpm checkpoint <n>`.
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Path, Runtime, Schema } from "effect"
import { Argument, Command, Flag } from "effect/cli"
import { isMain, runFile } from "./entrypoint.ts"

export class LessonError extends Schema.TaggedError<LessonError>()("LessonError", {
  message: Schema.String
}) {
  override readonly [Runtime.errorReported] = false
}

export const command = Command.make(
  "lesson",
  {
    lesson: Argument.Int("lesson").pipe(Argument.withDescription("Lesson number, 2 to 10")),
    solution: Flag.Boolean("solution").pipe(
      Flag.withDescription("Run the solution instead of the start file"),
      Flag.withDefault(false)
    )
  },
  Effect.fn(function*({ lesson, solution }) {
    if (lesson < 2) {
      return yield* new LessonError({
        message: `There is no lesson ${lesson}. The course opens on the /learn page, and Part 1 starts at lesson 2.`
      })
    }
    if (lesson > 10) {
      return yield* new LessonError({
        message: `Lesson ${lesson} is written in src/. Its reference solution runs with \`pnpm checkpoint ${lesson}\`.`
      })
    }
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const part1 = path.join(import.meta.dirname, "..", "lessons", "part1")
    const prefix = String(lesson).padStart(2, "0")
    const entries = yield* fs.readDirectory(part1).pipe(Effect.orElseSucceed((): Array<string> => []))
    const directory = entries.find((entry) => entry.startsWith(`${prefix}-`))
    if (directory === undefined) {
      return yield* new LessonError({ message: `No lesson ${lesson} in lessons/part1/` })
    }
    const file = path.join(part1, directory, solution ? "solution" : "start", "main.ts")
    yield* Console.log(`Running ${path.relative(process.cwd(), file)}`)
    return yield* runFile(file, [])
  })
).pipe(Command.withDescription("Run a Part 1 lesson file"))

if (isMain(import.meta)) {
  command.pipe(
    Command.run({ version: "0.0.0" }),
    Effect.tapErrorTag("LessonError", (error) => Console.error(error.message)),
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
