import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import type { OpenGraphError } from "@website/open-graph/OpenGraph"
import { OpenGraph, layer as openGraphLayer } from "./Application"
import { OgNotFound } from "./Model"

const notFound = HttpServerResponse.text("Not Found", { status: 404 })
const internalError = HttpServerResponse.text("Unable to generate image", {
  status: 500,
})

const reportInternalError = (error: OpenGraphError) => {
  const cause = error.cause.cause
  const detail =
    cause instanceof Error
      ? `${cause.name}: ${cause.message}\n${cause.stack ?? ""}`
      : String(cause)
  return Effect.logError(
    `Open Graph request failed (${error.cause._tag}): ${detail}`,
  ).pipe(Effect.as(internalError))
}

export const route = HttpRouter.add(
  "GET",
  "/og/*",
  Effect.fnUntraced(
    function* (request) {
      const openGraph = yield* OpenGraph
      const url = new URL(request.originalUrl)
      const pathname = url.pathname
      if (!pathname.startsWith("/og/") || !pathname.endsWith(".png")) {
        return yield* new OgNotFound({ slug: pathname })
      }
      const slug = pathname.slice("/og/".length, -".png".length)
      const bytes = yield* openGraph.generate(slug, url)
      return HttpServerResponse.uint8Array(bytes, {
        contentType: "image/png",
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      })
    },
    Effect.catchTag("OgNotFound", () => Effect.succeed(notFound)),
    Effect.catchTag("OpenGraphError", reportInternalError),
  ),
)

const middleware = HttpRouter.middleware<{
  provides: OpenGraph
}>()(
  Effect.gen(function* () {
    const openGraph = yield* OpenGraph
    return (httpEffect) =>
      Effect.provideService(httpEffect, OpenGraph, openGraph)
  }),
)

export const layer = middleware.layer.pipe(Layer.provide(openGraphLayer))
