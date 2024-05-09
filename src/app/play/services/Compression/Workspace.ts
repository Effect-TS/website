import { File, Workspace } from "@/domain/Workspace"
import { Effect, Layer } from "effect"
import { Compression } from "../Compression"

const make = Effect.gen(function* () {
  const compression = yield* Compression

  const compress = <E, R>(
    workspace: Workspace,
    read: (file: string) => Effect.Effect<string, E, R>
  ) =>
    Effect.forEach(workspace.filePaths, ([file, path]) =>
      read(path).pipe(
        Effect.map((content) => ({
          name: file.name,
          language: file.language,
          interesting: file.interesting,
          content
        }))
      )
    ).pipe(
      Effect.map(JSON.stringify),
      Effect.andThen(compression.compressBase64)
    )

  const decompress = <E, R>(options: {
    name: string
    command?: string | undefined
    compressed: string
  }) =>
    compression.decompressBase64(options.compressed).pipe(
      Effect.map(JSON.parse),
      Effect.map((files: Array<any>) =>
        files.map(
          (file) =>
            new File({
              name: file.name,
              initialContent: file.content,
              interesting: file.interesting,
              language: file.language
            })
        )
      ),
      Effect.map((files) => new Workspace({ ...options, tree: files }))
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
