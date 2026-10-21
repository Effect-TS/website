import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Headers from "effect/http/Headers"
import * as HttpEffect from "effect/http/HttpEffect"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as RateLimiter from "effect/persistence/RateLimiter"
import { VoteRefusedError } from "./errors"
import {
  CurrentVoter,
  NoStore,
  SameOrigin,
  VoteRateLimit,
  Voter,
  VoterIdentity,
} from "./middleware"
import { VoterSigner } from "./voter"

const originOf = Option.liftThrowable((url: string) => new URL(url).origin)

/** A POST that a page on another site sent is turned down. */
export const SameOriginLive = Layer.succeed(SameOrigin, (httpEffect) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const sender = Headers.get(request.headers, "origin")
    const ownOrigin = originOf(request.originalUrl)
    if (
      request.method !== "GET" &&
      Option.exists(sender, (origin) => !Option.contains(ownOrigin, origin))
    ) {
      return yield* new VoteRefusedError({ reason: "InvalidVoter" })
    }
    return yield* httpEffect
  }),
)

/** 20 votes a minute for each client address. */
export const VoteRateLimitLive = Layer.effect(
  VoteRateLimit,
  Effect.gen(function* () {
    const limiter = yield* RateLimiter.RateLimiter
    return (httpEffect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const key = Headers.get(request.headers, "cf-connecting-ip").pipe(
          Option.getOrElse(() => "unknown"),
        )
        yield* limiter
          .consume({ key, limit: 20, window: "1 minute", onExceeded: "fail" })
          .pipe(
            Effect.catchTag("RateLimiterError", ({ reason }) =>
              Match.value(reason).pipe(
                Match.tag(
                  "RateLimitExceeded",
                  () => new VoteRefusedError({ reason: "RateLimited" }),
                ),
                Match.tag("RateLimitStoreError", Effect.die),
                Match.exhaustive,
              ),
            ),
          )
        return yield* httpEffect
      })
  }),
)

/** Names the voter from the cookie: nobody, a voter the server issued, or a forgery. */
export const VoterIdentityLive = Layer.effect(
  VoterIdentity,
  Effect.gen(function* () {
    const signer = yield* VoterSigner
    return {
      voter: (httpEffect, { credential }) => {
        const token = Redacted.value(credential)
        const voter =
          token === ""
            ? Voter.Anonymous()
            : Option.match(signer.verify(token), {
                onNone: () => Voter.Tampered(),
                onSome: (id) => Voter.Known({ id }),
              })
        return Effect.provideService(httpEffect, CurrentVoter, voter)
      },
    }
  }),
)

export const NoStoreLive = Layer.succeed(NoStore, (httpEffect) =>
  HttpEffect.appendPreResponseHandler((_request, response) =>
    Effect.succeed(
      HttpServerResponse.setHeader(
        response,
        "cache-control",
        "private, no-store",
      ),
    ),
  ).pipe(Effect.andThen(httpEffect)),
)
