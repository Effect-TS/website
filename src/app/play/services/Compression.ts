import { Data, Effect, Layer } from "effect"

export class CompressionError extends Data.TaggedError("CompressionError")<{
  readonly method: "compress" | "decompress"
  readonly cause: unknown
}> {}

const make = Effect.gen(function* () {
  const compress = (content: string) =>
    Effect.tryPromise({
      try: async () => {
        const blob = new Blob([content], { type: "text/plain" })
        const stream = blob
          .stream()
          .pipeThrough(new CompressionStream("gzip"))
        return await new Response(stream).arrayBuffer()
      },
      catch: (cause) => new CompressionError({ method: "compress", cause })
    })

  const compressBase64 = (content: string) =>
    compress(content).pipe(Effect.map(arrayBufferToBase64))

  const decompress = (buffer: ArrayBuffer) =>
    Effect.tryPromise({
      try: async () => {
        const blob = new Blob([buffer], { type: "application/gzip" })
        const stream = blob
          .stream()
          .pipeThrough(new DecompressionStream("gzip"))
        return await new Response(stream).text()
      },
      catch: (cause) => new CompressionError({ method: "decompress", cause })
    })

  const decompressBase64 = (base64: string) =>
    Effect.try({
      try: () => base64ToArrayBuffer(base64),
      catch: (cause) => new CompressionError({ method: "decompress", cause })
    }).pipe(Effect.andThen(decompress))

  return { compress, compressBase64, decompress, decompressBase64 } as const
})

export class Compression extends Effect.Tag("app/Compression")<
  Compression,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make)
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = ""
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (var i = 0, len = binaryString.length; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
