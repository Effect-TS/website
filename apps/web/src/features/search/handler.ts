import * as Layer from "effect/Layer"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { SearchLayer } from "./server"

const { handler, dispose } = HttpRouter.toWebHandler(
  SearchLayer.pipe(Layer.provide(HttpServer.layerServices)),
)

// The HttpApi router matches the full request path, so a single handler serves
// every `/api/search*` route. Each Astro page file below delegates to it.
export { handler }

function cleanup() {
  dispose().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}

process.on("SIGINT", cleanup)
