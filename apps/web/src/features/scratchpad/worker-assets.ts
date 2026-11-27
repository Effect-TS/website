/**
 * Loading the language server's wasm module inside the worker, streamed into
 * `WebAssembly.compileStreaming` while counting bytes.
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
