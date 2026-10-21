import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import * as ModuleContentLive from "@/features/module-of-the-week/astro-content"
import { Modules } from "@/features/module-of-the-week/service"
import { ModuleRequestsApi } from "./api"
import { apiReferenceLayer } from "./catalog"
import * as D1 from "./d1"
import { ModuleVotes } from "./service"
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

// Cloudflare's test keys for an invisible check that always passes
const DEV_SETTINGS: Settings = {
  db: undefined,
  limiter: undefined,
  secret: "development-only-secret",
  turnstile: {
    siteKey: "1x00000000000000000000BB",
    secret: "1x0000000000000000000000000000000AA",
  },
}

// `astro dev` has no `cloudflare:workers` module, so the import waits until
// deployed, where the Worker's bindings come from `alchemy.run.ts`.
const loadSettings = async (): Promise<Settings> => {
  if (import.meta.env.DEV) return DEV_SETTINGS
  const { env } = await import("cloudflare:workers")
  if (
    !env.MODULE_VOTES_SECRET ||
    !env.TURNSTILE_SITE_KEY ||
    !env.TURNSTILE_SECRET
  ) {
    throw new Error(
      "Module votes are missing MODULE_VOTES_SECRET or the Turnstile keys",
    )
  }
  return {
    db: env.DB,
    limiter: env.MODULE_VOTES_LIMIT,
    secret: env.MODULE_VOTES_SECRET,
    turnstile: {
      siteKey: env.TURNSTILE_SITE_KEY,
      secret: env.TURNSTILE_SECRET,
    },
  }
}

let settings: Promise<Settings> | undefined
const getSettings = () => (settings ??= loadSettings())

const Handlers = HttpApiBuilder.group(
  ModuleRequestsApi,
  "moduleRequests",
  Effect.fn(function* (handlers) {
    const votes = yield* ModuleVotes
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
).pipe(Layer.provide(ModuleVotes.layer))

// Votes live in D1 when deployed, and in memory for as long as `astro dev` runs.
const Dependencies = Layer.unwrap(
  Effect.promise(getSettings).pipe(
    Effect.map(({ db, turnstile }) =>
      Layer.mergeAll(
        db ? D1.layer(db) : memoryLayer,
        apiReferenceLayer,
        Modules.layer.pipe(Layer.provide(ModuleContentLive.layer)),
        siteverifyLayer(turnstile.siteKey, turnstile.secret),
      ),
    ),
  ),
)

const ModuleRequestsLayer = HttpApiBuilder.layer(ModuleRequestsApi).pipe(
  Layer.provide(Handlers),
  Layer.provide(Dependencies),
  Layer.provide(HttpServer.layerServices),
)

const { handler } = HttpRouter.toWebHandler(ModuleRequestsLayer)

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
  const { secret, limiter } = await getSettings()
  const secure = isHttps(request)
  const post = request.method === "POST"

  if (post) {
    // Browsers send Origin on POSTs. A page on another site cannot vote.
    const origin = request.headers.get("origin")
    if (origin !== null && origin !== new URL(request.url).origin)
      return refusal("InvalidVoter", 403)

    const key = request.headers.get("cf-connecting-ip")
    if (limiter && key && !(await limiter.limit({ key })).success)
      return refusal("RateLimited", 429)
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
