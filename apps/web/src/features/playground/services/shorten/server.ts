import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import { ShortenApi } from "./api"
import { Shorten } from "./service"

const ShortenHandlers = HttpApiBuilder.group(
  ShortenApi,
  "shorten",
  Effect.fn(function* (handlers) {
    const shorten = yield* Shorten
    return handlers
      .handle("shorten", ({ payload }) => shorten.shorten(payload.text))
      .handle("retrieve", ({ params }) =>
        shorten.retrieve(params.hash).pipe(Effect.map(Option.fromNullishOr)),
      )
  }),
).pipe(Layer.provide(Shorten.layer))

const ShortenLayer = HttpApiBuilder.layer(ShortenApi).pipe(
  Layer.provide(ShortenHandlers),
  Layer.provide(HttpServer.layerServices),
)

export const { dispose, handler } = HttpRouter.toWebHandler(ShortenLayer)
