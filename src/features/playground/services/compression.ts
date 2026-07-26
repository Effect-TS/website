import { Context, Effect, Layer } from "effect"
import * as Data from "effect/Data"
import * as Encoding from "effect/Encoding"
import { flow, pipe } from "effect/Function"
import * as Schema from "effect/Schema"
import { Workspace } from "../domain/workspace"

export class CompressionError extends Data.TaggedError("CompressionError")<{
  readonly method: "compress" | "decompress"
  readonly cause: unknown
}> {}

export class Compression extends Context.Service<Compression>()("app/Compression", {
  // oxlint-disable-next-line require-yield
  make: Effect.gen(function* () {
    const compress = (content: string) =>
      Effect.tryPromise({
        try: async () => {
          const blob = new Blob([content], { type: "text/plain" })
          const stream = blob.stream().pipeThrough(new CompressionStream("deflate-raw"))
          return new Uint8Array(await new Response(stream).arrayBuffer())
        },
        catch: (cause) => new CompressionError({ method: "compress", cause }),
      })

    const compressBase64 = (content: string) =>
      compress(content).pipe(Effect.map(Encoding.encodeBase64))

    const decompress = (buffer: Uint8Array) =>
      Effect.tryPromise({
        try: async () => {
          const blob = new Blob([buffer as BlobPart], { type: "application/gzip" })
          const stream = blob.stream().pipeThrough(new DecompressionStream("deflate-raw"))
          return await new Response(stream).text()
        },
        catch: (cause) => new CompressionError({ method: "decompress", cause }),
      })

    const decompressBase64 = (base64: string) =>
      Effect.fromResult(Encoding.decodeBase64(base64)).pipe(
        Effect.catch(() => Effect.fromResult(Encoding.decodeBase64Url(base64))),
        Effect.mapError((cause) => new CompressionError({ method: "decompress", cause })),
        Effect.andThen(decompress),
      )

    return {
      compress,
      compressBase64,
      decompress,
      decompressBase64,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

const decodeWorkspace = flow(
  Schema.decodeEffect(Schema.fromJsonString(Workspace)),
  Effect.mapError((cause) => new CompressionError({ method: "decompress", cause })),
)
const encodeWorkspace = flow(
  Schema.encodeEffect(Schema.fromJsonString(Workspace)),
  Effect.mapError((cause) => new CompressionError({ method: "compress", cause })),
)

export class WorkspaceCompression extends Context.Service<WorkspaceCompression>()(
  "app/Compression/Workspace",
  {
    make: Effect.gen(function* () {
      const compression = yield* Compression

      const snapshot = <E, R>(
        workspace: Workspace,
        read: (file: string) => Effect.Effect<string, E, R>,
      ) =>
        workspace
          .withPrepare("pnpm install")
          .withNoSnapshot.updateFiles((file, path) =>
            read(workspace.relativePath(path)).pipe(
              Effect.map((content) => file.withContent(content)),
            ),
          )

      const compress = <E, R>(
        workspace: Workspace,
        read: (file: string) => Effect.Effect<string, E, R>,
      ) =>
        pipe(
          snapshot(workspace, read),
          Effect.andThen(encodeWorkspace),
          Effect.andThen(compression.compressBase64),
        )

      const decompress = (compressed: string) =>
        pipe(
          compression.decompressBase64(compressed),
          Effect.andThen(decodeWorkspace),
          // Older shared playgrounds may persist npm, but type acquisition expects pnpm's store.
          Effect.map((workspace) => workspace.withPrepare("pnpm install")),
        )

      return { compress, decompress, snapshot } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(Layer.provide(Compression.layer))
}
