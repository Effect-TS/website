import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import { ShortenError } from "./domain"
import { Shorten } from "./service"
import * as Schema from "effect/Schema"

export class ShortenRpcs extends RpcGroup.make(
  Rpc.make("shorten", {
    payload: { text: Schema.String },
    error: ShortenError,
    success: Schema.String
  }),
  Rpc.make("retrieve", {
    payload: { hash: Schema.String },
    error: ShortenError,
    success: Schema.Option(Schema.String)
  })
) {}

export const ShortenLayer = ShortenRpcs.toLayer(
  Effect.gen(function* () {
    const shorten = yield* Shorten
    return {
      shorten: (params) => shorten.shorten(params.text),
      retrieve: (params) => shorten.retrieve(params.hash)
    }
  })
).pipe(Layer.provide(Shorten.Default))
