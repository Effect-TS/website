import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import { FetchHttpClient } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { ShortenApi } from "./api"

export class ShortenClient extends Context.Service<
  ShortenClient,
  HttpApiClient.ForApi<typeof ShortenApi>
>()("app/ShortenClient") {
  static readonly layer = Layer.effect(
    ShortenClient,
    HttpApiClient.make(ShortenApi),
  ).pipe(Layer.provide(FetchHttpClient.layer))
}
