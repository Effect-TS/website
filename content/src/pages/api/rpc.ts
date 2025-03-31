import type { APIRoute } from "astro"
import * as Layer from "effect/Layer"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import { ShortenLayer, ShortenRpcs } from "@/services/shorten/rpc"
import * as HttpServer from "@effect/platform/HttpServer"

export const prerender = false

const handler = RpcServer.toWebHandler(ShortenRpcs, {
  layer: Layer.mergeAll(
    ShortenLayer,
    RpcSerialization.layerJson,
    HttpServer.layerContext
  )
})

export const POST: APIRoute = ({ request }) => handler.handler(request)
