import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Headers from "effect/http/Headers"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import {
  CurrentVoter,
  MotwVoteApi,
  VoteRateLimit,
  VoterIdentity,
  voterCookie,
} from "./api"
import { ModuleCatalog } from "./catalog"
import { VoteRefusedError } from "./domain"
import { ClientRateLimit, SecureCookie, Turnstile, VoterSigner } from "./guards"
import { VoteStore } from "./vote-store"

const VoteRateLimitLive = Layer.effect(
  VoteRateLimit,
  Effect.gen(function* () {
    const rateLimit = yield* ClientRateLimit
    return (httpEffect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const key = Headers.get(request.headers, "cf-connecting-ip").pipe(
          Option.getOrElse(() => "unknown"),
        )
        if (!(yield* rateLimit.allow(key))) {
          return yield* new VoteRefusedError({ reason: "RateLimited" })
        }
        return yield* httpEffect
      })
  }),
)

const VoterIdentityLive = Layer.effect(
  VoterIdentity,
  Effect.gen(function* () {
    const signer = yield* VoterSigner
    return {
      voter: Effect.fnUntraced(function* (httpEffect, { credential }) {
        const voter = yield* signer.verify(Redacted.value(credential))
        return yield* Effect.provideService(httpEffect, CurrentVoter, voter)
      }),
    }
  }),
)

const MotwVoteHandlers = HttpApiBuilder.group(
  MotwVoteApi,
  "motwVote",
  Effect.fnUntraced(function* (handlers) {
    const store = yield* VoteStore
    const catalog = yield* ModuleCatalog
    const turnstile = yield* Turnstile
    const signer = yield* VoterSigner
    const secure = yield* SecureCookie

    const isVotable = (id: string) =>
      Effect.map(catalog.status(id), (status) => status === "votable")

    const issueVoter = Effect.gen(function* () {
      const { id, token } = yield* signer.issue
      yield* HttpApiBuilder.securitySetCookie(voterCookie, token, {
        path: "/api/motw-vote",
        sameSite: "lax",
        secure,
        maxAge: Duration.days(365),
      })
      return id
    })

    return handlers
      .handle(
        "ranking",
        Effect.fn("MotwVote.ranking")(function* () {
          const voter = yield* CurrentVoter
          const [requests, voted] = yield* Effect.all(
            [
              store.top,
              Option.match(voter, {
                onNone: () => Effect.succeed([]),
                onSome: store.votedBy,
              }),
            ],
            { concurrency: "unbounded" },
          )
          return {
            requests: yield* Effect.filter(requests, ({ id }) => isVotable(id)),
            voted: yield* Effect.filter(voted, isVotable),
            turnstileSiteKey: turnstile.siteKey,
          }
        }),
      )
      .handle(
        "vote",
        Effect.fn("MotwVote.vote")(function* ({ payload }) {
          const status = yield* catalog.status(payload.id)
          if (status !== "votable") {
            return yield* new VoteRefusedError({
              reason: status === "covered" ? "Covered" : "UnknownModule",
            })
          }
          if (!(yield* turnstile.verify(payload.token))) {
            return yield* new VoteRefusedError({ reason: "ChallengeFailed" })
          }
          const known = yield* CurrentVoter
          const voter = Option.isSome(known) ? known.value : yield* issueVoter
          return yield* store.add(voter, payload.id)
        }),
      )
      .handle(
        "unvote",
        Effect.fn("MotwVote.unvote")(function* ({ payload }) {
          const voter = yield* CurrentVoter
          return yield* Option.match(voter, {
            onNone: () =>
              Effect.map(store.count(payload.id), (votes) => ({
                id: payload.id,
                votes,
                voted: false,
              })),
            onSome: (voterId) => store.remove(voterId, payload.id),
          })
        }),
      )
  }),
)

// Every response depends on the voter
const NoStore = HttpRouter.middleware(
  (httpEffect) =>
    Effect.map(
      httpEffect,
      HttpServerResponse.setHeader("cache-control", "private, no-store"),
    ),
  { global: true },
)

export const MotwVoteLive = Layer.mergeAll(
  HttpApiBuilder.layer(MotwVoteApi).pipe(
    Layer.provide(
      MotwVoteHandlers.pipe(
        Layer.provide([VoterIdentityLive, VoteRateLimitLive]),
      ),
    ),
  ),
  NoStore,
).pipe(Layer.provide(VoterSigner.layer))

const Environment: Layer.Layer<VoteStore | ClientRateLimit | ModuleCatalog> =
  Layer.unwrap(
    Effect.promise(() =>
      import.meta.env.DEV ? import("./dev") : import("./cloudflare"),
    ).pipe(
      Effect.map(
        ({ layer }): Layer.Layer<VoteStore | ClientRateLimit | ModuleCatalog> =>
          layer,
      ),
    ),
  )

export const { dispose, handler } = HttpRouter.toWebHandler(
  MotwVoteLive.pipe(
    Layer.provide(Turnstile.layer),
    Layer.provide(Environment),
    Layer.provide(HttpServer.layerServices),
  ),
)
