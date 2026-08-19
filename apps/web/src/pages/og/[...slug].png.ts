import type { APIRoute } from "astro"
import { env } from "cloudflare:workers"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import {
  layer as openGraphLayer,
  route as openGraphRoute,
} from "@/features/open-graph/Http"
import { layer as astroFontCatalogLayer } from "@/features/open-graph/Fonts"

const fetchLayer = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.Fetch, (input, init) => {
      const request = new Request(input, init)
      return new URL(request.url).pathname.startsWith("/_astro/fonts/")
        ? env.ASSETS.fetch(request)
        : globalThis.fetch(request)
    }),
  ),
)

// Slugs derive from arbitrary page pathnames, so this route must render in the
// Cloudflare Worker instead of being enumerated at build time.
export const prerender = false

const AppLayer = HttpRouter.layer.pipe(
  Layer.provideMerge(openGraphRoute.pipe(Layer.provide(openGraphLayer))),
  Layer.provide(astroFontCatalogLayer),
  Layer.provide(fetchLayer),
  Layer.provide(HttpServer.layerServices),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

export const GET: APIRoute = ({ request }) => handler(request)
