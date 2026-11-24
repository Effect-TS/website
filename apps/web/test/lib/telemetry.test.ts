import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Tracer from "effect/Tracer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import { RedactUrlParamsLayer } from "../../src/lib/telemetry.ts"

// Runs a route the way `/api/search` does, with a tracer that keeps its spans,
// and returns the server span's attributes.
async function serverSpanAttributes(
  layer: Layer.Layer<never>,
  url: string,
): Promise<ReadonlyMap<string, unknown>> {
  const spans: Array<Tracer.NativeSpan> = []
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    },
  })
  const { handler, dispose } = HttpRouter.toWebHandler(
    HttpRouter.add(
      "GET",
      "/api/search",
      Effect.succeed(HttpServerResponse.text("ok")),
    ).pipe(
      Layer.provide(HttpServer.layerServices),
      Layer.provideMerge(layer),
      Layer.provideMerge(Layer.succeed(Tracer.Tracer, tracer)),
    ),
    { disableLogger: true },
  )
  try {
    const response = await handler(new Request(url))
    assert.strictEqual(response.status, 200)
  } finally {
    await dispose()
  }
  const server = spans.find((span) => span.kind === "server")
  assert.isDefined(server)
  return server.attributes
}

const url = "https://effect.website/api/search?query=my+secret+project"

test("server spans record the search query as REDACTED", async () => {
  const attributes = await serverSpanAttributes(RedactUrlParamsLayer, url)

  const full = String(attributes.get("url.full"))
  assert.match(full, /\/api\/search\?query=REDACTED$/)
  assert.notInclude(full, "secret")
  assert.strictEqual(attributes.get("url.query"), "query=REDACTED")
  assert.strictEqual(attributes.get("url.path"), "/api/search")
})

test("without the layer the query would reach span attributes", async () => {
  const attributes = await serverSpanAttributes(Layer.empty, url)

  assert.include(String(attributes.get("url.full")), "my+secret+project")
})
