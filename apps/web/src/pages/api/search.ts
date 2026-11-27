import type { APIRoute } from "astro"
import { env, waitUntil } from "cloudflare:workers"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import { SearchLayer } from "@/features/search/server"
import { TelemetryLayer, telemetry } from "@/lib/telemetry"

export const prerender = false

const { handler, dispose } = HttpRouter.toWebHandler(
  SearchLayer.pipe(
    Layer.provide(HttpServer.layerServices),
    Layer.provideMerge(TelemetryLayer),
  ),
)

export const GET: APIRoute = async ({ request }) => {
  const response = await handler(request)
  // Send this request's spans after the response, without delaying it.
  waitUntil(telemetry.flush(env))
  return response
}

function cleanup() {
  dispose().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}

process.on("SIGINT", cleanup)
