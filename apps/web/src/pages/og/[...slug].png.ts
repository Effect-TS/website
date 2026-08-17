import type { APIRoute } from "astro"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import {
  layer as openGraphLayer,
  route as openGraphRoute,
} from "@/features/open-graph/Http"
import { layer as astroFontCatalogLayer } from "@/features/open-graph/Fonts"

// Slugs derive from arbitrary page pathnames, so this route must render in the
// Cloudflare Worker instead of being enumerated at build time.
export const prerender = false

const AppLayer = HttpRouter.layer.pipe(
  Layer.provideMerge(openGraphRoute.pipe(Layer.provide(openGraphLayer))),
  Layer.provide(astroFontCatalogLayer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(HttpServer.layerServices),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

export const GET: APIRoute = ({ request }) => handler(request)
