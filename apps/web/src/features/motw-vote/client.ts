import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpApiClient from "effect/http-api/HttpApiClient"
import { MotwVoteApi } from "./api"

export class MotwVoteClient extends Context.Service<
  MotwVoteClient,
  HttpApiClient.ForApi<typeof MotwVoteApi>
>()("app/MotwVoteClient") {
  static readonly layer = Layer.effect(
    MotwVoteClient,
    HttpApiClient.make(MotwVoteApi),
  ).pipe(Layer.provide(FetchHttpClient.layer))
}
