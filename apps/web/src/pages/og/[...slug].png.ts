import type { APIRoute } from "astro"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { OpenGraphRoute } from "@/features/open-graph/Http"
import { OpenGraphMiddlewareLive } from "@/features/open-graph/Live"

// On-demand server endpoint: slugs derive from arbitrary page pathnames
// (see BaseLayout.getOgImagePath), so the route cannot be enumerated at build
// time. Run it as a Vercel serverless function instead of a static asset.
export const prerender = false

const AppLayer = HttpRouter.layer.pipe(
  Layer.provideMerge(
    OpenGraphRoute.pipe(Layer.provide(OpenGraphMiddlewareLive)),
  ),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(HttpServer.layerServices),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

export const GET: APIRoute = ({ request }) => handler(request)
