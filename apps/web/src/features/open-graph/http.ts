import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type { OpenGraphError } from "@website/open-graph/OpenGraph"
import * as OpenGraphGenerator from "./generator"
import { MetadataNotFound } from "./model"

const notFoundResponse = HttpServerResponse.text("Not Found", { status: 404 })

const internalErrorResponse = HttpServerResponse.text(
  "Unable to generate image",
  { status: 500 },
)

const reportInternalError = (error: OpenGraphError) => {
  const cause = error.cause.cause
  const detail =
    cause instanceof Error
      ? `${cause.name}: ${cause.message}\n${cause.stack ?? ""}`
      : String(cause)
  return Effect.logError(
    `Open Graph request failed (${error.cause._tag}): ${detail}`,
  ).pipe(Effect.as(internalErrorResponse))
}

export const layer = Effect.gen(function* () {
  const openGraph = yield* OpenGraphGenerator.OpenGraphGenerator

  return HttpRouter.add(
    "GET",
    "/og/*",
    Effect.fnUntraced(
      function* (request) {
        const url = new URL(request.originalUrl)
        const pathname = url.pathname
        if (!pathname.startsWith("/og/") || !pathname.endsWith(".png")) {
          return yield* new MetadataNotFound({ slug: pathname })
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
      Effect.catchTag("MetadataNotFound", () =>
        Effect.succeed(notFoundResponse),
      ),
      Effect.catchTag("OpenGraphError", reportInternalError),
    ),
  )
}).pipe(Layer.unwrap, Layer.provide(OpenGraphGenerator.layer))
