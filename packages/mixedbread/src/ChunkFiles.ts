import { toFile } from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import { MAX_CHUNKS_PER_FILE, MAX_MIXEDBREAD_TEXT_LENGTH } from "./Config.ts"
import { UnknownError } from "./Error.ts"

export interface LocalFile {
  readonly externalId: string
  readonly fileHash: string
  readonly metadata: Readonly<Record<string, string>>
  readonly upload: () =>
    | ReturnType<typeof toFile>
    | Promise<ReturnType<typeof toFile>>
}

/** Split chunks into files of at most `size`, filling the first files first. */
export function shardChunks<A>(
  chunks: ReadonlyArray<A>,
  size: number = MAX_CHUNKS_PER_FILE,
): Array<ReadonlyArray<A>> {
  return Array.from({ length: Math.ceil(chunks.length / size) }, (_, index) =>
    chunks.slice(index * size, (index + 1) * size),
  )
}

/**
 * Upload files for pre-chunked content: `<name>-001.mxjson`, `<name>-002.mxjson`
 * and so on under `directory`. Both API reference and changelog search use it,
 * so both obey the same limits on chunks per file and on chunk text.
 */
export const chunkFiles = Effect.fn("ChunkFiles.chunkFiles")(
  function* (options: {
    readonly chunks: ReadonlyArray<{ readonly text: string }>
    readonly directory: string
    readonly name: string
    readonly metadata: Readonly<Record<string, string>>
    readonly hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>
  }) {
    const { chunks, directory, hash, metadata, name } = options
    const tooLong = chunks.find(
      ({ text }) => text.length > MAX_MIXEDBREAD_TEXT_LENGTH,
    )
    if (tooLong !== undefined) {
      return yield* new UnknownError({
        cause: new Error(
          `Search chunk exceeds ${MAX_MIXEDBREAD_TEXT_LENGTH} characters in ${directory}/${name}: ${JSON.stringify(tooLong.text.slice(0, 80))}`,
        ),
      })
    }

    return yield* Effect.forEach(shardChunks(chunks), (shard, index) => {
      const filename = `${name}-${String(index + 1).padStart(3, "0")}.mxjson`
      const bytes = new TextEncoder().encode(JSON.stringify(shard))
      return hash(bytes).pipe(
        Effect.map(
          (fileHash) =>
            ({
              externalId: [directory, filename].join("/"),
              fileHash,
              metadata,
              upload: () =>
                toFile(bytes, filename, {
                  type: "application/vnd-mxbai.chunks-json",
                }),
            }) satisfies LocalFile,
        ),
      )
    })
  },
)
