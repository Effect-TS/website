import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

const HEADER_SEPARATOR = Buffer.from("\r\n\r\n", "ascii")
const CONTENT_LENGTH_RE = /^content-length:\s*(\d+)\s*$/im
const MAX_HEADER_BYTES = 8 * 1024

export class InvalidLspFrameError extends Data.TaggedError(
  "InvalidLspFrameError",
)<{
  readonly reason: string
  readonly header?: string | undefined
}> {}

/**
 * Encode a bare JSON-RPC string into an LSP `Content-Length` framed byte buffer.
 * Uses UTF-8 byte length (not JS UTF-16 code-unit length).
 */
export const encodeLspFrame = (json: string): Uint8Array => {
  const body = Buffer.from(json, "utf8")
  const header = Buffer.from(
    `Content-Length: ${body.byteLength}\r\n\r\n`,
    "ascii",
  )
  return Buffer.concat([header, body])
}

/**
 * Encode a stream of bare JSON-RPC strings into `Content-Length` framed byte chunks.
 */
export const encodeLspFrames = <E, R>(
  input: Stream.Stream<string, E, R>,
): Stream.Stream<Uint8Array, E, R> => Stream.map(input, encodeLspFrame)

/**
 * Decode a stream of raw stdout bytes from an LSP server into bare JSON-RPC message strings.
 * Fails with `InvalidLspFrameError` on malformed headers or truncated trailing frames.
 */
export const decodeLspFrames = <E, R>(
  input: Stream.Stream<Uint8Array, E, R>,
): Stream.Stream<string, E | InvalidLspFrameError, R> =>
  Stream.suspend(() => {
    let buffer = Buffer.alloc(0)

    const push = (
      chunk: Uint8Array,
    ): Effect.Effect<ReadonlyArray<string>, InvalidLspFrameError> =>
      Effect.suspend(() => {
        if (chunk.byteLength === 0) {
          return Effect.succeed([])
        }

        buffer =
          buffer.byteLength === 0
            ? Buffer.from(chunk)
            : Buffer.concat([buffer, chunk])

        const messages: Array<string> = []

        while (true) {
          const headerEnd = buffer.indexOf(HEADER_SEPARATOR)
          if (headerEnd === -1) {
            if (buffer.byteLength > MAX_HEADER_BYTES) {
              return Effect.fail(
                new InvalidLspFrameError({
                  reason: `LSP header exceeded ${MAX_HEADER_BYTES} bytes without terminator`,
                }),
              )
            }
            break
          }

          const headerText = buffer.subarray(0, headerEnd).toString("ascii")
          const match = CONTENT_LENGTH_RE.exec(headerText)
          if (!match) {
            return Effect.fail(
              new InvalidLspFrameError({
                reason: "Missing or invalid Content-Length header",
                header: headerText,
              }),
            )
          }

          const contentLength = Number.parseInt(match[1]!, 10)
          if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
            return Effect.fail(
              new InvalidLspFrameError({
                reason: `Invalid Content-Length value: ${match[1]}`,
                header: headerText,
              }),
            )
          }

          const bodyStart = headerEnd + HEADER_SEPARATOR.byteLength
          const bodyEnd = bodyStart + contentLength

          if (buffer.byteLength < bodyEnd) {
            break
          }

          const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8")
          messages.push(body)
          buffer = buffer.subarray(bodyEnd)
        }

        return Effect.succeed(messages)
      })

    const flush = Effect.suspend(() =>
      buffer.byteLength === 0
        ? Effect.void
        : Effect.fail(
            new InvalidLspFrameError({
              reason: `Truncated LSP frame at end of stream (${buffer.byteLength} trailing bytes)`,
            }),
          ),
    )

    return input.pipe(
      Stream.mapEffect(push),
      Stream.flatMap((messages) => Stream.fromIterable(messages)),
      Stream.concat(Stream.fromEffect(flush).pipe(Stream.drain)),
    )
  })
