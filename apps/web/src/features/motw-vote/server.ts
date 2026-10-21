import { env } from "cloudflare:workers"
import * as D1Client from "@effect/sql-d1/D1Client"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import { MotwVoteLive } from "./api-live"
import * as Catalog from "./catalog"
import * as RateLimitStore from "./rate-limit-store"
import * as Turnstile from "./turnstile"
import * as SqlVoteStore from "./sql-vote-store"
import { memoryLayer } from "./vote-store"

// `astro dev` has none of the bindings or secrets `alchemy.run.ts` gives the
// Worker. It keeps votes in memory and uses Cloudflare's test keys for an
// invisible check that always passes. A deployed Worker never gets these.
const DevConfig = ConfigProvider.layerAdd(
  ConfigProvider.fromEnvRecord({
    MOTW_VOTE_SECRET: "development-only-secret",
    TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
    TURNSTILE_SECRET: "1x0000000000000000000000000000000AA",
  }),
  { asPrimary: false },
)

// Votes and rate limits live in D1 when deployed
const Persistence = env.DB
  ? Layer.mergeAll(SqlVoteStore.layer, RateLimitStore.layer).pipe(
      Layer.provide(Layer.orDie(D1Client.layer({ db: env.DB }))),
    )
  : Layer.mergeAll(memoryLayer, RateLimiter.layerStoreMemory)

// Build output is read through the Worker's `ASSETS` binding, as in
// `features/open-graph/fonts.ts`. The host of its URLs is ignored.
const AssetsHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.map(
    HttpClient.HttpClient,
    HttpClient.mapRequest(
      HttpClientRequest.prependUrl("https://assets.invalid"),
    ),
  ),
).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(
    Layer.succeed(FetchHttpClient.Fetch, (input, init) =>
      env.ASSETS.fetch(new Request(input, init)),
    ),
  ),
)

const ModuleCatalog = import.meta.env.DEV
  ? Catalog.devLayer
  : Catalog.layer.pipe(Layer.provide(AssetsHttpClient))

const Dependencies = Layer.mergeAll(
  Persistence,
  ModuleCatalog,
  Turnstile.layer.pipe(Layer.provide(FetchHttpClient.layer)),
)

const MotwVoteRoutes = MotwVoteLive.pipe(
  Layer.provide(Dependencies),
  Layer.provide(HttpServer.layerServices),
  Layer.provide(import.meta.env.DEV ? DevConfig : Layer.empty),
)

export const { handler } = HttpRouter.toWebHandler(MotwVoteRoutes)
