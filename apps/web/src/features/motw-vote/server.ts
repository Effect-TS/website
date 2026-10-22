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
import { MotwVoteLive } from "./api-live"
import * as Catalog from "./catalog"
import * as RateLimit from "./rate-limit"
import * as Turnstile from "./turnstile"
import * as SqlVoteStore from "./sql-vote-store"
import { TURNSTILE_TEST_KEYS } from "./turnstile-test-keys"
import { memoryLayer } from "./vote-store"

// `astro dev` has none of the bindings or secrets `alchemy.run.ts` gives the
// Worker. It keeps votes in memory and uses Cloudflare's test keys for an
// invisible check that always passes. A deployed Worker never gets these.
const DevConfig = ConfigProvider.layerAdd(
  ConfigProvider.fromEnvRecord({
    MOTW_VOTE_SECRET: "development-only-secret",
    TURNSTILE_SITE_KEY: TURNSTILE_TEST_KEYS.siteKey,
    TURNSTILE_SECRET: TURNSTILE_TEST_KEYS.secret,
  }),
  { asPrimary: false },
)

// Votes live in D1, and Cloudflare counts the rate limit. `astro dev` has
// neither binding, so it keeps votes in memory and does not limit.
const Persistence = import.meta.env.DEV
  ? Layer.mergeAll(memoryLayer, RateLimit.unlimited)
  : Layer.mergeAll(
      SqlVoteStore.layer.pipe(
        Layer.provide(Layer.orDie(D1Client.layer({ db: env.DB }))),
      ),
      RateLimit.layer(env.MOTW_VOTE_LIMIT),
    )

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
  ? Layer.unwrap(
      Effect.promise(() => import("./catalog-dev")).pipe(
        Effect.map((dev) => dev.layer),
      ),
    )
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
