import { env } from "cloudflare:workers"
import * as D1Client from "@effect/sql-d1/D1Client"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as RateLimit from "./rate-limit"
import * as SqlVoteStore from "./sql-vote-store"

// The bindings `alchemy.run.ts` gives the Worker, as layers. This is the only
// file of the feature that imports `cloudflare:workers`.

/** Votes in the `DB` D1 database. */
export const Votes = SqlVoteStore.layer.pipe(
  Layer.provide(Layer.orDie(D1Client.layer({ db: env.DB }))),
)

/** The rate limit Cloudflare counts. */
export const Limits = RateLimit.layer(env.MOTW_VOTE_LIMIT)

// Build output is read through the `ASSETS` binding, as in
// `features/open-graph/fonts.ts`. The host of its URLs is ignored. The fetch
// client is fresh: a shared one would send every other request to `ASSETS` too.
/** An HTTP client that reads the build output. */
export const Assets = Layer.effect(
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
