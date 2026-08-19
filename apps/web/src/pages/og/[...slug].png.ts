import type { APIRoute } from "astro"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as OpenGraphRoute from "@/features/open-graph/http"
import * as OpenGraphFonts from "@/features/open-graph/fonts"

export const prerender = false

const HttpLayer = HttpRouter.layer.pipe(
  Layer.provideMerge(OpenGraphRoute.layer),
  Layer.provide(OpenGraphFonts.layer),
  Layer.provide(HttpServer.layerServices),
)

const { handler } = HttpRouter.toWebHandler(HttpLayer)

export const GET: APIRoute = ({ request }) => handler(request)
