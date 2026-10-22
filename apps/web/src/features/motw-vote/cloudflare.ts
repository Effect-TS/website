import { env } from "cloudflare:workers"
import * as D1Client from "@effect/sql-d1/D1Client"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import { ModuleCatalog } from "./catalog"
import { ClientRateLimit } from "./rate-limit"
import { VoteStore } from "./vote-store"

// Reads the build output through the `ASSETS` binding, as in
// `features/open-graph/fonts.ts`. The host of its URLs is ignored. The fetch
// client is fresh: a shared one would send every other request to `ASSETS` too.
const Assets = Layer.effect(
  HttpClient.HttpClient,
  Effect.map(
    HttpClient.HttpClient,
    HttpClient.mapRequest(
      HttpClientRequest.prependUrl("https://assets.invalid"),
    ),
  ),
).pipe(
  Layer.provide(Layer.fresh(FetchHttpClient.layer)),
  Layer.provide(
    Layer.succeed(FetchHttpClient.Fetch, (input, init) =>
      env.ASSETS.fetch(new Request(input, init)),
    ),
  ),
)

export const layer = Layer.mergeAll(
  VoteStore.layerD1.pipe(
    Layer.provide(Layer.orDie(D1Client.layer({ db: env.DB }))),
  ),
  ClientRateLimit.layer(env.MOTW_VOTE_LIMIT),
  ModuleCatalog.layer.pipe(Layer.provide(Assets)),
)
