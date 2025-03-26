import * as Layer from "effect/Layer"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcClient from "@effect/rpc/RpcClient"

export const ShortenClientLayer = RpcClient.layerProtocolHttp({
  url: "/api/rpc/"
}).pipe(Layer.provide([
  FetchHttpClient.layer,
  RpcSerialization.layerJson
]))

