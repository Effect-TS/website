import { createHash } from "node:crypto"
import * as Effect from "effect/Effect"
import { assert, describe, test } from "vite-plus/test"
import { chunkFiles, shardChunks } from "../src/ChunkFiles.ts"
import {
  MAX_CHUNKS_PER_FILE,
  MAX_MIXEDBREAD_TEXT_LENGTH,
} from "../src/Config.ts"

const hash = (bytes: Uint8Array) =>
  Effect.succeed(createHash("sha256").update(bytes).digest("hex"))

const chunks = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ text: `chunk ${index}` }))

const run = (items: ReadonlyArray<{ readonly text: string }>) =>
  Effect.runPromise(
    chunkFiles({
      chunks: items,
      directory: "api-reference/v4",
      name: "sql-pg",
      metadata: { package_slug: "sql-pg" },
      hash,
    }),
  )

describe("shardChunks", () => {
  test("fills the first files first", () => {
    const shards = shardChunks(chunks(MAX_CHUNKS_PER_FILE * 2 + 1))
    assert.deepStrictEqual(
      shards.map(({ length }) => length),
      [MAX_CHUNKS_PER_FILE, MAX_CHUNKS_PER_FILE, 1],
    )
  })

  test("makes no file for no chunks", () => {
    assert.deepStrictEqual(shardChunks([]), [])
  })
})

describe("chunkFiles", () => {
  test("numbers files and keeps the metadata", async () => {
    const files = await run(chunks(MAX_CHUNKS_PER_FILE + 1))
    assert.deepStrictEqual(
      files.map(({ externalId }) => externalId),
      [
        "api-reference/v4/sql-pg-001.mxjson",
        "api-reference/v4/sql-pg-002.mxjson",
      ],
    )
    assert.deepStrictEqual(files[0]?.metadata, { package_slug: "sql-pg" })
  })

  test("hashes the bytes it uploads, so equal chunks give equal hashes", async () => {
    const [first] = await run(chunks(3))
    const [again] = await run(chunks(3))
    const [other] = await run(chunks(4))
    assert.strictEqual(first?.fileHash, again?.fileHash)
    assert.notStrictEqual(first?.fileHash, other?.fileHash)
  })

  test("rejects a chunk that is longer than the vendor accepts", async () => {
    const error = await Effect.runPromise(
      chunkFiles({
        chunks: [{ text: "x".repeat(MAX_MIXEDBREAD_TEXT_LENGTH + 1) }],
        directory: "api-reference/v4",
        name: "sql-pg",
        metadata: {},
        hash,
      }).pipe(Effect.flip),
    )
    assert.strictEqual(error._tag, "UnknownError")
    assert.match(
      String(error.cause),
      /exceeds 65536 characters in api-reference\/v4\/sql-pg/,
    )
  })
})
