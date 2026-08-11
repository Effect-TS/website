import { Effect, type Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { OpenGraph } from "./Application"
import { OgContentError, OgFontError, OgNotFound, OgRenderError } from "./Model"

const notFound = HttpServerResponse.text("Not Found", { status: 404 })
const internalError = HttpServerResponse.text("Unable to generate image", {
  status: 500,
})

const reportInternalError = (
  error: OgContentError | OgFontError | OgRenderError,
) =>
  Effect.logError("Open Graph request failed", error).pipe(
    Effect.as(internalError),
  )

export const makeOpenGraphRoute = (openGraphLayer: Layer.Layer<OpenGraph>) =>
  HttpRouter.add(
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
      Effect.catchTags({
        OgContentError: reportInternalError,
        OgFontError: reportInternalError,
        OgRenderError: reportInternalError,
      }),
      Effect.provide(openGraphLayer),
    ),
  )
