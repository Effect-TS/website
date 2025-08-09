import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServer from "@effect/platform/HttpServer"
import type { APIRoute } from "astro"
import * as Layer from "effect/Layer"
import { SearchLayer } from "../../services/search/api"

export const prerender = false

const { handler, dispose } = HttpApiBuilder.toWebHandler(
  Layer.mergeAll(SearchLayer, HttpServer.layerContext),
)

export const GET: APIRoute = ({ request }) => handler(request)

function cleanup() {
  dispose().then(
    () => {
      process.exit(0)
    },
    () => {
      process.exit(1)
    },
  )
}

process.on("SIGINT", cleanup)
