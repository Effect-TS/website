import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  decodeLspFrames,
  encodeLspFrame,
  encodeLspFrames,
} from "../src/Framing.ts"

describe("Framing", () => {
  test("encodes and decodes multi-byte UTF-8 payloads using byte length", async () => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method: "window/logMessage",
      params: { message: "héllo 🚀 日本語" },
    })
    const expectedByteLength = Buffer.byteLength(payload, "utf8")
    assert.isAbove(expectedByteLength, payload.length)

    const encoded = encodeLspFrame(payload)
    const encodedText = Buffer.from(encoded).toString("utf8")
    assert.strictEqual(
      encodedText,
      `Content-Length: ${expectedByteLength}\r\n\r\n${payload}`,
    )

    const decoded = await Effect.runPromise(
      Stream.make(payload).pipe(
        encodeLspFrames,
        decodeLspFrames,
        Stream.runCollect,
      ),
    )

    assert.deepStrictEqual(Array.from(decoded), [payload])
  })

  test("decodes frames split across arbitrary 1-byte chunks including multi-byte UTF-8", async () => {
    const first = JSON.stringify({ jsonrpc: "2.0", id: 1, result: "café" })
    const second = JSON.stringify({ jsonrpc: "2.0", id: 2, result: "🚀✨" })
    const combined = Buffer.concat([
      encodeLspFrame(first),
      encodeLspFrame(second),
    ])

    const oneByteChunks = Array.from(combined, (byte) => new Uint8Array([byte]))

    const decoded = await Effect.runPromise(
      Stream.fromIterable(oneByteChunks).pipe(
        decodeLspFrames,
        Stream.runCollect,
      ),
    )

    assert.deepStrictEqual(Array.from(decoded), [first, second])
  })

  test("decodes coalesced multi-frame chunks in a single buffer", async () => {
    const frames = [
      JSON.stringify({ jsonrpc: "2.0", id: 1, result: null }),
      JSON.stringify({ jsonrpc: "2.0", method: "initialized", params: {} }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, result: { items: [] } }),
    ]
    const coalesced = Buffer.concat(frames.map(encodeLspFrame))

    const decoded = await Effect.runPromise(
      Stream.make(coalesced).pipe(decodeLspFrames, Stream.runCollect),
    )

    assert.deepStrictEqual(Array.from(decoded), frames)
  })

  test("accepts additional LSP headers alongside Content-Length", async () => {
    const payload = JSON.stringify({ jsonrpc: "2.0", id: 1, result: "ok" })
    const raw = Buffer.from(
      `Content-Type: application/vscode-jsonrpc; charset=utf-8\r\ncontent-length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`,
      "utf8",
    )

    const decoded = await Effect.runPromise(
      Stream.make(raw).pipe(decodeLspFrames, Stream.runCollect),
    )

    assert.deepStrictEqual(Array.from(decoded), [payload])
  })

  test("fails with InvalidLspFrameError when Content-Length header is missing", async () => {
    const raw = Buffer.from("X-Other: 123\r\n\r\n{}", "ascii")

    const error = await Effect.runPromise(
      Stream.make(raw).pipe(decodeLspFrames, Stream.runCollect, Effect.flip),
    )

    assert.strictEqual(error._tag, "InvalidLspFrameError")
  })

  test("fails with InvalidLspFrameError on truncated trailing frame at EOF", async () => {
    const raw = Buffer.from('Content-Length: 50\r\n\r\n{"partial":true', "utf8")

    const error = await Effect.runPromise(
      Stream.make(raw).pipe(decodeLspFrames, Stream.runCollect, Effect.flip),
    )

    assert.strictEqual(error._tag, "InvalidLspFrameError")
  })
})
