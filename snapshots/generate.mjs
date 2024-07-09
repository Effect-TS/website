import { Console, Effect, Stream } from "effect"
import * as Command from "@effect/platform/Command"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as NodeContext from "@effect/platform-node/NodeContext"
import { snapshot } from "@webcontainer/snapshot"
import { fileURLToPath } from "node:url"

function isDirectory(info) {
  return info.type === "Directory"
}

function processDirectory(directory) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    // Cleanup from previous run if necessary
    const pathsToCleanup = ["node_modules", ".pnpm-store"].map((file) =>
      path.join(directory, file)
    )
    yield* Effect.forEach(
      pathsToCleanup,
      (path) => fs.remove(path, { force: true, recursive: true }),
      { discard: true, concurrency: pathsToCleanup.length }
    )

    // Install snapshot dependencies
    yield* Command.make("corepack", "pnpm", "install").pipe(
      Command.workingDirectory(directory),
      Command.streamLines,
      Stream.runForEach((line) => Console.log(line))
    )

    // Remove `node_modules` before creating snapshot
    yield* fs.remove(path.join(directory, "node_modules"), {
      force: true,
      recursive: true
    })

    // Create and write snapshot
    const outputDir = path.resolve(
      directory,
      "..",
      "..",
      "public",
      "snapshots"
    )
    const outputFile = path.join(outputDir, path.basename(directory))

    yield* Effect.log(`Creating binary snapshot of '${directory}'`)
    const buffer = yield* Effect.promise(() => snapshot(directory))

    yield* fs.writeFile(outputFile, buffer)

    yield* Effect.log(`Wrote snapshot to '${outputDir}'`)
  }).pipe(Effect.withSpan("processDirectory", { attributes: { directory } }))
}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const dirname = path.dirname(fileURLToPath(import.meta.url))

  const files = yield* fs.readDirectory(dirname)

  yield* Effect.forEach(files, (file) => {
    const filePath = path.join(dirname, file)
    return processDirectory(filePath).pipe(
      Effect.whenEffect(fs.stat(filePath).pipe(Effect.map(isDirectory)))
    )
  })
})

Effect.scoped(program).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(NodeContext.layer),
  Effect.runPromise
)
