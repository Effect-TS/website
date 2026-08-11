import { Effect, Option, type Layer } from "effect"
import { Headers, HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { OpenGraph } from "./Application"
import {
  OgContentError,
  OgFontError,
  OgNotFound,
  OgRenderError,
  OgRequestError,
} from "./Model"

const notFound = HttpServerResponse.text("Not Found", { status: 404 })
const internalError = HttpServerResponse.text("Unable to generate image", {
  status: 500,
})

const reportInternalError = (
  error: OgContentError | OgFontError | OgRenderError | OgRequestError,
) =>
  Effect.logError("Open Graph request failed", error).pipe(
    Effect.as(internalError),
  )

const requestUrl = (request: {
  readonly url: string
  readonly headers: Headers.Headers
}) =>
  Effect.try({
    try: () => {
      if (URL.canParse(request.url)) {
        return new URL(request.url)
      }
      const forwardedHost = Option.getOrUndefined(
        Headers.get(request.headers, "x-forwarded-host"),
      )
      const host =
        forwardedHost ??
        Option.getOrUndefined(Headers.get(request.headers, "host"))
      if (host === undefined) {
        throw new Error("The request has no host header")
      }
      const forwardedProtocol = Option.getOrUndefined(
        Headers.get(request.headers, "x-forwarded-proto"),
      )
      const protocol =
        forwardedProtocol?.split(",", 1)[0] ??
        (host.startsWith("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https")
      return new URL(request.url, `${protocol}://${host}`)
    },
    catch: (cause) => new OgRequestError({ url: request.url, cause }),
  })

export const makeOpenGraphRoute = (openGraphLayer: Layer.Layer<OpenGraph>) =>
  HttpRouter.add("GET", "/og/*", (request) =>
    Effect.gen(function* () {
      const openGraph = yield* OpenGraph
      const url = yield* requestUrl(request)
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
    }).pipe(
      Effect.catchTag("OgNotFound", () => Effect.succeed(notFound)),
      Effect.catchTags({
        OgContentError: reportInternalError,
        OgFontError: reportInternalError,
        OgRenderError: reportInternalError,
        OgRequestError: reportInternalError,
      }),
      Effect.provide(openGraphLayer),
    ),
  )
