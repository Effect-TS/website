import type { APIRoute } from "astro"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"

export const prerender = false

const DPRINT_PLUGINS_BASE_URL = "https://plugins.dprint.dev"

const PluginName = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.wasm$/

const PluginPathParams = Schema.Struct({
  plugin: Schema.String.check(Schema.isPattern(PluginName)),
})
type PluginPathParams = typeof PluginPathParams.Type

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
          const response = yield* httpClient.get(params.plugin)
          return HttpServerResponse.fromClientResponse(response)
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
