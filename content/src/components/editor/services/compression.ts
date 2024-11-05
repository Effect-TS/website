import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { flow, pipe } from "effect/Function"
import * as Schema from "effect/Schema"
import { Workspace } from "../domain/workspace"

export class CompressionError extends Data.TaggedError("CompressionError")<{
  readonly method: "compress" | "decompress"
  readonly cause: unknown
}> { }

export class Compression extends Effect.Service<Compression>()("app/Compression", {
  effect: Effect.gen(function*() {
    const compress = (content: string) =>
      Effect.tryPromise({
        try: async () => {
          const blob = new Blob([content], { type: "text/plain" })
          const stream = blob
            .stream()
            .pipeThrough(new CompressionStream("deflate-raw"))
          return new Uint8Array(await new Response(stream).arrayBuffer())
        },
        catch: (cause) => new CompressionError({ method: "compress", cause })
      })

    const compressBase64 = (content: string) =>
      compress(content).pipe(Effect.map(Encoding.encodeBase64))

    const decompress = (buffer: Uint8Array) =>
      Effect.tryPromise({
        try: async () => {
          const blob = new Blob([buffer], { type: "application/gzip" })
          const stream = blob
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw"))
          return await new Response(stream).text()
        },
        catch: (cause) => new CompressionError({ method: "decompress", cause })
      })

    const decompressBase64 = (base64: string) => 
      Encoding.decodeBase64(base64).pipe(
        Effect.mapError((cause) => new CompressionError({ method: "decompress", cause })),
        Effect.andThen(decompress)
      )

    return { compress, compressBase64, decompress, decompressBase64 } as const
  })
}) { }

const decodeWorkspace = flow(
  Schema.decode(Schema.parseJson(Workspace)),
  Effect.orDie
)
const encodeWorkspace = flow(
  Schema.encode(Schema.parseJson(Workspace)),
  Effect.orDie
)

export class WorkspaceCompression extends Effect.Service<WorkspaceCompression>()(
  "app/Compression/Workspace",
  {
    dependencies: [Compression.Default],
    effect: Effect.gen(function*() {
      const compression = yield* Compression

      const compress = <E, R>(
        workspace: Workspace,
        read: (file: string) => Effect.Effect<string, E, R>
      ) =>
        pipe(
          workspace
            .withPrepare("pnpm install")
            .withNoSnapshot
            .updateFiles((file, path) =>
              read(workspace.relativePath(path)).pipe(
                Effect.map((content) => file.withContent(content))
              )
            ),
          Effect.andThen(encodeWorkspace),
          Effect.andThen(compression.compressBase64)
        )

      const decompress = (compressed: string) =>
        pipe(
          compression.decompressBase64(compressed),
          Effect.andThen(decodeWorkspace)
        )

      return { compress, decompress } as const
    })
  }) { }
