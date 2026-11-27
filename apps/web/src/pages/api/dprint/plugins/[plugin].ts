import type { APIRoute } from "astro"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpServerError from "effect/http/HttpServerError"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
export const prerender = false

const DPRINT_PLUGINS_BASE_URL = "https://plugins.dprint.dev"

const PluginName = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.wasm$/

const PluginPathParams = Schema.Struct({
  plugin: Schema.String.check(Schema.isPattern(PluginName)),
})
type PluginPathParams = typeof PluginPathParams.Type

/**
 * Headers for a plugin response. plugins.dprint.dev sends its plugins (2-4 MB
 * each) uncompressed as `application/octet-stream`, which Cloudflare does not
 * compress. We send them as `application/wasm`, which lets the browser compile
 * them while they download (`WebAssembly.compileStreaming`), and ask for gzip:
 * a Worker that sets `Content-Encoding` has the runtime compress the body to
 * match, which cuts a plugin to about a quarter of its size. Plugin URLs are
 * versioned, so the browser can keep them for good.
 */
const pluginHeaders = (acceptEncoding: string): Record<string, string> => ({
  "cache-control": "public, max-age=31536000, immutable",
  vary: "accept-encoding",
  ...(/\bgzip\b/i.test(acceptEncoding) ? { "content-encoding": "gzip" } : {}),
})

const invalidPluginResponse = HttpServerResponse.text(
  "Invalid dprint plugin name",
  { status: 400 },
)

const DprintPluginRoute = Layer.unwrap(
  Effect.gen(function* () {
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
      HttpClient.mapRequest((request) =>
        request.pipe(HttpClientRequest.prependUrl(DPRINT_PLUGINS_BASE_URL)),
      ),
    )

    return HttpRouter.add(
      "GET",
      "/api/dprint/plugins/:plugin",
      Effect.fnUntraced(
        function* () {
          const params = yield* HttpRouter.schemaPathParams(PluginPathParams)
          const request = yield* HttpServerRequest.HttpServerRequest
          const response = yield* httpClient.get(params.plugin)
          return HttpServerResponse.stream(response.stream, {
            contentType: "application/wasm",
            headers: pluginHeaders(request.headers["accept-encoding"] ?? ""),
          })
        },
        Effect.catchTag("SchemaError", () =>
          Effect.succeed(invalidPluginResponse),
        ),
        Effect.catch(
          Effect.fnUntraced(function* (error) {
            yield* Effect.logError("Failed to get plugin", Cause.fail(error))
            return yield* new HttpServerError.InternalError({
              request: HttpServerRequest.fromClientRequest(error.request),
            })
          }),
        ),
      ),
    )
  }),
)

const HttpLayer = HttpRouter.layer.pipe(
  Layer.provideMerge(DprintPluginRoute),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(HttpServer.layerServices),
)

const { dispose, handler } = HttpRouter.toWebHandler(HttpLayer)

function cleanup() {
  dispose().then(
    () => {
      process.exit(0)
    },
    () => {
      process.exit(1)
    },
  )
}

process.on("SIGINT", cleanup)

export const GET: APIRoute = ({ request }) => handler(request)
