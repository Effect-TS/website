import type { APIRoute } from "astro"
import { Layer } from "effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization"
import * as RpcServer from "effect/unstable/rpc/RpcServer"
import { ShortenRpcs } from "@/services/shorten/rpc"
import { ShortenLayer } from "@/services/shorten/rpc-server"

export const prerender = false

const rpcRoute = RpcServer.layerHttp({
  group: ShortenRpcs,
  path: "/api/rpc",
  protocol: "http",
}).pipe(Layer.provide(ShortenLayer), Layer.provide(RpcSerialization.layerJson))

const appLayer = HttpRouter.layer.pipe(Layer.provideMerge(rpcRoute))

const { dispose, handler } = HttpRouter.toWebHandler(appLayer)

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

export const POST: APIRoute = ({ request }) => handler(request)
