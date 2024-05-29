import { Workspace } from "@/workspaces/domain/workspace"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Compression } from "./Compression"
import * as Schema from "@effect/schema/Schema"
import { pipe } from "effect"

const decodeWorkspace = Schema.decode(Schema.parseJson(Workspace))
const encodeWorkspace = Schema.encode(Schema.parseJson(Workspace))

const make = Effect.gen(function* () {
  const compression = yield* Compression

  const compress = <E, R>(
    workspace: Workspace,
    read: (file: string) => Effect.Effect<string, E, R>
  ) => {
    return pipe(
      workspace
        .withPrepare("npm install")
        .withNoSnapshot.updateFiles((file, path) =>
          read(path).pipe(Effect.map((content) => file.withContent(content)))
        ),
      Effect.andThen(encodeWorkspace),
      Effect.andThen(compression.compressBase64)
    )
  }

  const decompress = (compressed: string) =>
    pipe(
      compression.decompressBase64(compressed),
      Effect.andThen(decodeWorkspace)
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
