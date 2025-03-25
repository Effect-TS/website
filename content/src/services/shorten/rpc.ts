import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import { ShortenRequest, RetrieveRequest } from "./domain"
import { Shorten } from "./service"

export class ShortenRpcs extends RpcGroup.make(
  Rpc.fromTaggedRequest(ShortenRequest),
  Rpc.fromTaggedRequest(RetrieveRequest),
) { }

export const ShortenLayer = ShortenRpcs.toLayer(
  Effect.gen(function*() {
    const shorten = yield* Shorten
    return {
      ShortenRequest: (params) => shorten.shorten(params.text),
      RetrieveRequest: (params) => shorten.retrieve(params.hash)
    }
  })
).pipe(Layer.provide(Shorten.Default))

