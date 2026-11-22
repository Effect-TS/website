/**
 * Loading the language server's assets inside the worker: the wasm module
 * (streamed into `WebAssembly.compileStreaming` while counting bytes) and the
 * types packs (gzip-compressed on the wire, inflated here).
 */

export class AssetLoadError extends Error {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options)
    this.name = "AssetLoadError"
  }
}

export type FetchLike = (url: string) => Promise<Response>

const failedResponse = (url: string, response: Response) =>
  new AssetLoadError(
    `Fetching ${url} failed with ${response.status} ${response.statusText}`.trim(),
  )

/**
 * Wraps a response so every chunk read from its body is counted, keeping its
 * headers (a counted `application/wasm` response still compiles streaming).
 */
export const countingResponse = (
  response: Response,
  onBytes: (chunkBytes: number) => void,
): Response => {
  if (response.body === null) return response
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      onBytes(chunk.byteLength)
      controller.enqueue(chunk)
    },
  })
  return new Response(response.body.pipeThrough(counter), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export const fetchCounted = async (
  fetchFn: FetchLike,
  url: string,
  onBytes: (chunkBytes: number) => void,
): Promise<Response> => {
  let response: Response
  try {
    response = await fetchFn(url)
  } catch (cause) {
    throw new AssetLoadError(`Fetching ${url} failed`, { cause })
  }
  if (!response.ok) throw failedResponse(url, response)
  return countingResponse(response, onBytes)
}

export const isGzip = (bytes: Uint8Array): boolean =>
  bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b

/**
 * Inflates gzip bytes, and passes anything else through (a server may already
 * have decoded a `Content-Encoding: gzip` response).
 */
export const inflateIfGzip = async (bytes: Uint8Array): Promise<Uint8Array> => {
  if (!isGzip(bytes)) return bytes
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const stream = new Blob([copy.buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export const loadTypesPack = async (
  fetchFn: FetchLike,
  url: string,
  onBytes: (chunkBytes: number) => void,
): Promise<Uint8Array> => {
  const response = await fetchCounted(fetchFn, url, onBytes)
  return inflateIfGzip(new Uint8Array(await response.arrayBuffer()))
}
