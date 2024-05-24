import { File, Workspace, WorkspaceShell } from "../domain/workspace"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Compression } from "./Compression"

type WorkspaceCompressed = [
  name: string,
  files: ReadonlyArray<WorkspaceCompressedFile>
]
type WorkspaceCompressedFile = [
  name: string,
  language: string,
  content: string
]

const make = Effect.gen(function* () {
  const compression = yield* Compression

  const compress = <E, R>(
    workspace: Workspace,
    read: (file: string) => Effect.Effect<string, E, R>
  ) =>
    Effect.forEach(workspace.filePaths, ([file, path]) =>
      read(path).pipe(
        Effect.map(
          (content): WorkspaceCompressedFile => [
            file.name,
            file.language,
            content
          ]
        )
      )
    ).pipe(
      Effect.map((files) => JSON.stringify([workspace.name, files])),
      Effect.andThen(compression.compressBase64)
    )

  const decompress = (options: {
    shells: ReadonlyArray<WorkspaceShell>
    initialFilePath?: string | undefined
    compressed: string
    whitelist: ReadonlyArray<string>
  }) =>
    compression.decompressBase64(options.compressed).pipe(
      Effect.map(JSON.parse),
      Effect.map(
        ([name, files]: WorkspaceCompressed) =>
          new Workspace({
            name,
            prepare: "npm install",
            initialFilePath: options.initialFilePath,
            shells: options.shells,
            tree: files
              .map(
                ([name, language, initialContent]) =>
                  new File({
                    name,
                    initialContent,
                    language
                  })
              )
              .filter((file) => options.whitelist.includes(file.name))
          })
      )
    )

  return { compress, decompress } as const
})

export class WorkspaceCompression extends Effect.Tag(
  "app/Compression/Workspace"
)<WorkspaceCompression, Effect.Effect.Success<typeof make>>() {
  static Live = Layer.effect(WorkspaceCompression, make).pipe(
    Layer.provide(Compression.Live)
  )
}
