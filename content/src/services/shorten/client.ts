import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ShortenRpcs } from "./rpc"

export class ShortenClient extends Effect.Service<ShortenClient>()(
  "app/ShortenClient",
  {
    scoped: RpcClient.make(ShortenRpcs),
    dependencies: [
      RpcClient.layerProtocolHttp({ url: "/api/rpc/" }).pipe(
        Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson])
      )
    ]
  }
) {}
