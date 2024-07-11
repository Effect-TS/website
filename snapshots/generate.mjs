import { Array, Console, Effect, Stream } from "effect"
import * as Command from "@effect/platform/Command"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as NodeContext from "@effect/platform-node/NodeContext"
import { snapshot } from "@webcontainer/snapshot"
import { fileURLToPath } from "node:url"
import packageJson from "./package.json" assert { type: "json" }

const constChunks = 10

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const directory = yield* fs.makeTempDirectoryScoped()

  yield* Effect.annotateLogsScoped({ directory })
  yield* Effect.log("Processing")

  yield* fs.writeFileString(
    path.join(directory, "package.json"),
    JSON.stringify(packageJson, null, 2)
  )
  yield* fs.writeFileString(
    path.join(directory, ".npmrc"),
    "store-dir=.pnpm-store\n"
  )

  yield* Command.make("corepack", "pnpm", "install").pipe(
    Command.workingDirectory(directory),
    Command.streamLines,
    Stream.runForEach((line) => Console.log(line))
  )

  const pnpmFiles = path.join(directory, ".pnpm-store/v3/files")
  const directories = yield* fs.readDirectory(
    path.join(directory, ".pnpm-store/v3/files")
  )
  const chunks = Array.split(directories, constChunks)

  yield* Effect.forEach(
    chunks,
    (chunk, i) =>
      Effect.gen(function* () {
        const chunkDir = path.join(directory, `snapshot-${i}`)
        const filesDir = path.join(chunkDir, "v3/files")
        yield* fs.makeDirectory(filesDir, {
          recursive: true
        })
        yield* Effect.forEach(
          chunk,
          (dir) =>
            fs.rename(path.join(pnpmFiles, dir), path.join(filesDir, dir)),
          { concurrency: 10 }
        )
        const outputDir = path.join(
          fileURLToPath(import.meta.url),
          "../../public/snapshots"
        )
        const outputFile = path.join(outputDir, `snapshot-${i}`)

        yield* Effect.log(`Creating binary snapshot`)
        const buffer = yield* Effect.promise(() => snapshot(chunkDir))

        yield* fs.writeFile(outputFile, buffer)
      }).pipe(Effect.annotateLogs({ chunk: i })),
    { concurrency: 3, discard: true }
  )
  //
  // // Create and write snapshot
  // const cacheDir = path.join(directory, ".pnpm-store")
  // const outputDir = path.join(
  //   fileURLToPath(import.meta.url),
  //   "../../public/snapshots"
  // )
  // const outputFile = path.join(outputDir, encodeURIComponent(module))
  //
  // yield* Effect.log(`Creating binary snapshot`)
  // const buffer = yield* Effect.promise(() => snapshot(cacheDir))
  //
  // yield* fs.writeFile(outputFile, buffer)
  //
  // yield* Effect.log(`Wrote snapshot to '${outputDir}'`)
}).pipe(Effect.scoped)

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(NodeContext.layer),
  Effect.runPromise
)
