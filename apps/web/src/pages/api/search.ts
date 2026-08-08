import type { APIRoute } from "astro"
import * as Layer from "effect/Layer"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { SearchLayer } from "../../services/search/api"

export const prerender = false

const { handler, dispose } = HttpRouter.toWebHandler(
  SearchLayer.pipe(Layer.provide(HttpServer.layerServices)),
)

export const GET: APIRoute = ({ request }) => handler(request)

function cleanup() {
  dispose().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}

process.on("SIGINT", cleanup)
