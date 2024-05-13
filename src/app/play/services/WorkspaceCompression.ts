import { File, Workspace, WorkspaceShell } from "@/domain/Workspace"
import { Effect, Layer } from "effect"
import { Compression } from "./Compression"

const make = Effect.gen(function* () {
  const compression = yield* Compression

  const compress = <E, R>(
    workspace: Workspace,
    name: string,
    read: (file: string) => Effect.Effect<string, E, R>
  ) =>
    Effect.forEach(workspace.filePaths, ([file, path]) =>
      read(path).pipe(
        Effect.map((content) => ({
          name: file.name,
          language: file.language,
          content
        }))
      )
    ).pipe(
      Effect.map((files) =>
        JSON.stringify({
          name,
          files
        })
      ),
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
        ({
          name,
          files
        }: {
          readonly name: string
          readonly files: ReadonlyArray<{
            readonly name: string
            readonly content: string
            readonly language: string
          }>
        }) =>
          new Workspace({
            ...options,
            name,
            tree: files
              .map(
                (file) =>
                  new File({
                    name: file.name,
                    initialContent: file.content,
                    language: file.language
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
