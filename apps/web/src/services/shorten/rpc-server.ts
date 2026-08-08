import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { ShortenRpcs } from "./rpc"
import { Shorten } from "./service"

export const ShortenLayer = ShortenRpcs.toLayer(
  Effect.gen(function* () {
    const svc = yield* Shorten
    return {
      shorten: (params: { text: string }) => svc.shorten(params.text),
      retrieve: (params: { hash: string }) =>
        svc.retrieve(params.hash).pipe(Effect.map(Option.fromNullishOr)),
    }
  }),
).pipe(Layer.provide(Shorten.layer))
