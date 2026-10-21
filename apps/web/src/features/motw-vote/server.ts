import { env } from "cloudflare:workers"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import { MotwVoteApi } from "./api"
import * as Catalog from "./catalog"
import * as D1 from "./d1"
import { MotwVotes } from "./service"
import { siteverifyLayer } from "./turnstile"
import {
  NIL_VOTER,
  clearedVoterCookie,
  identify,
  issueVoter,
  voterCookie,
} from "./voter"
import { memoryLayer } from "./vote-store"

interface Settings {
  readonly db: D1.D1Database | undefined
  readonly limiter:
    | {
        readonly limit: (options: {
          readonly key: string
        }) => Promise<{ readonly success: boolean }>
      }
    | undefined
  /** Signs the voter cookie. */
  readonly secret: string
  readonly turnstile: { readonly siteKey: string; readonly secret: string }
}

// `astro dev` has none of the bindings `alchemy.run.ts` gives the Worker. It
// keeps votes in memory and uses Cloudflare's test keys for an invisible check
// that always passes. A deployed Worker never falls back to these.
const DEV = {
  secret: "development-only-secret",
  turnstileSiteKey: "1x00000000000000000000BB",
  turnstileSecret: "1x0000000000000000000000000000000AA",
}

const settings = (): Settings => {
  const dev = import.meta.env.DEV
  const secret = env.MOTW_VOTE_SECRET ?? (dev ? DEV.secret : undefined)
  const siteKey =
    env.TURNSTILE_SITE_KEY ?? (dev ? DEV.turnstileSiteKey : undefined)
  const turnstileSecret =
    env.TURNSTILE_SECRET ?? (dev ? DEV.turnstileSecret : undefined)
  if (!secret || !siteKey || !turnstileSecret) {
    throw new Error(
      "The Worker is missing MOTW_VOTE_SECRET or the Turnstile keys",
    )
  }
  return {
    db: env.DB,
    limiter: env.MOTW_VOTE_LIMIT,
    secret,
    turnstile: { siteKey, secret: turnstileSecret },
  }
}

// The site's own origin, for reading build output when there is no `ASSETS`
// binding, as in `astro dev`.
let origin = ""

// Build output is read through the Worker's `ASSETS` binding, as in
// `features/open-graph/fonts.ts`. Its host is ignored.
const readAsset = (path: string): Promise<Response> => {
  const assets:
    | { readonly fetch: (request: Request) => Promise<Response> }
    | undefined = env.ASSETS
  return assets
    ? assets.fetch(new Request(`https://assets.invalid${path}`))
    : fetch(new URL(path, origin))
}

const Handlers = HttpApiBuilder.group(
  MotwVoteApi,
  "motwVote",
  Effect.fn(function* (handlers) {
    const votes = yield* MotwVotes
    return handlers
      .handle("ranking", ({ headers }) => votes.ranking(headers["x-voter-id"]))
      .handle("vote", ({ headers, payload }) =>
        votes.vote(
          headers["x-voter-id"],
          payload.id,
          payload.on,
          payload.token,
        ),
      )
  }),
).pipe(Layer.provide(MotwVotes.layer))

// Votes live in D1 when deployed, and in memory for as long as `astro dev` runs.
const Dependencies = Layer.unwrap(
  Effect.sync(settings).pipe(
    Effect.map(({ db, turnstile }) =>
      Layer.mergeAll(
        db ? D1.layer(db) : memoryLayer,
        Catalog.layer(readAsset),
        siteverifyLayer(turnstile.siteKey, turnstile.secret),
      ),
    ),
  ),
)

const MotwVoteLayer = HttpApiBuilder.layer(MotwVoteApi).pipe(
  Layer.provide(Handlers),
  Layer.provide(Dependencies),
  Layer.provide(HttpServer.layerServices),
)

const { handler } = HttpRouter.toWebHandler(MotwVoteLayer)

const isHttps = (request: Request) => new URL(request.url).protocol === "https:"

const refusal = (reason: string, status: number, cookie?: string) =>
  Response.json(
    { _tag: "VoteRefusedError", reason },
    { status, ...(cookie ? { headers: { "set-cookie": cookie } } : {}) },
  )

/**
 * Runs a request through the API as the voter its cookie names. The API trusts
 * the `x-voter-id` header, so it is always set here, from a cookie signed with
 * the server's secret, and never taken from the client.
 *
 * A POST without a valid cookie gets a new voter, whose cookie is set once the
 * vote succeeds. A cookie that was changed by the client blocks the request.
 */
export const serve = async (request: Request): Promise<Response> => {
  const { secret, limiter } = settings()
  const secure = isHttps(request)
  const post = request.method === "POST"
  origin = new URL(request.url).origin

  if (post) {
    // Browsers send Origin on POSTs. A page on another site cannot vote.
    const sender = request.headers.get("origin")
    if (sender !== null && sender !== origin)
      return refusal("InvalidVoter", 403)

    const key = request.headers.get("cf-connecting-ip")
    if (limiter && key && !(await limiter.limit({ key })).success) {
      return refusal("RateLimited", 429)
    }
  }

  const identity = await identify(request, secret)
  if (identity.tampered)
    return refusal("InvalidVoter", 403, clearedVoterCookie(secure))

  const issued =
    post && identity.voter === undefined ? await issueVoter(secret) : undefined
  const voter = issued?.voter ?? identity.voter ?? NIL_VOTER

  const headers = new Headers(request.headers)
  headers.set("x-voter-id", voter)
  const response = await handler(new Request(request, { headers }))

  if (issued && response.ok) {
    const withCookie = new Response(response.body, response)
    withCookie.headers.append("set-cookie", voterCookie(issued.token, secure))
    return withCookie
  }
  return response
}
