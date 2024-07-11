import { Console, Effect, Stream } from "effect"
import * as Command from "@effect/platform/Command"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as NodeContext from "@effect/platform-node/NodeContext"
import { snapshot } from "@webcontainer/snapshot"
import { fileURLToPath } from "node:url"
import packageJson from "./package.json" assert { type: "json" }

const processModule = ([module, version]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = yield* fs.makeTempDirectory()

    yield* Effect.annotateLogsScoped({ directory, module })
    yield* Effect.log("Processing")

    yield* fs.writeFileString(
      path.join(directory, "package.json"),
      JSON.stringify(
        { packageManager: "npm@10.2.3", dependencies: {} },
        null,
        2
      )
    )
    yield* fs.writeFileString(
      path.join(directory, ".npmrc"),
      "cache=.npm-cache\n"
    )

    yield* Command.make(
      "corepack",
      "npm",
      "install",
      `${module}@${version}`
    ).pipe(
      Command.workingDirectory(directory),
      Command.streamLines,
      Stream.runForEach((line) => Console.log(line))
    )

    // Create and write snapshot
    const cacheDir = path.join(directory, ".npm-cache")
    const outputDir = path.join(
      fileURLToPath(import.meta.url),
      "../../public/snapshots"
    )
    const outputFile = path.join(outputDir, encodeURIComponent(module))

    yield* Effect.log(`Creating binary snapshot`)
    const buffer = yield* Effect.promise(() => snapshot(cacheDir))

    yield* fs.writeFile(outputFile, buffer)

    yield* Effect.log(`Wrote snapshot to '${outputDir}'`)
  }).pipe(
    Effect.scoped,
    Effect.withSpan("processModule", { attributes: { module } })
  )

const program = Effect.forEach(
  Object.entries(packageJson.dependencies).filter(
    ([module]) => !["effect", "typescript"].includes(module)
  ),
  processModule,
  { concurrency: 5, discard: true }
)

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(NodeContext.layer),
  Effect.runPromise
)
