import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as RpcClient from "effect/unstable/rpc/RpcClient"
import { RpcClientError } from "effect/unstable/rpc/RpcClientError"
import * as RpcGroup from "effect/unstable/rpc/RpcGroup"
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization"
import { ShortenRpcs } from "./rpc"

export class ShortenClient extends Context.Service<
  ShortenClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof ShortenRpcs>, RpcClientError>
>()("app/ShortenClient") {
  static readonly layer = Layer.effect(ShortenClient, RpcClient.make(ShortenRpcs)).pipe(
    Layer.provide(
      RpcClient.layerProtocolHttp({
        url: "/api/rpc",
        transformClient: HttpClient.mapRequest(HttpClientRequest.setUrl("/api/rpc")),
      }).pipe(Layer.provide(FetchHttpClient.layer), Layer.provide(RpcSerialization.layerJson)),
    ),
  )
}
