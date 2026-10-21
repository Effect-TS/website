import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import { MotwVoteApi } from "./api"
import { CurrentVoter, Voter, voterCookie } from "./middleware"
import { MotwVotes } from "./service"

const cookieOptions = {
  path: "/api/motw-vote",
  sameSite: "lax",
  secure: !import.meta.env.DEV,
} as const

const setVoterCookie = (token: string) =>
  HttpApiBuilder.securitySetCookie(voterCookie, token, {
    ...cookieOptions,
    maxAge: Duration.days(365),
  })

const clearVoterCookie = HttpApiBuilder.securitySetCookie(voterCookie, "", {
  ...cookieOptions,
  maxAge: Duration.zero,
})

export const MotwVoteHandlers = HttpApiBuilder.group(
  MotwVoteApi,
  "motwVote",
  Effect.fn(function* (handlers) {
    const votes = yield* MotwVotes
    return handlers
      .handle("ranking", () =>
        Effect.gen(function* () {
          const voter = yield* CurrentVoter
          if (Voter.$is("Tampered")(voter)) yield* clearVoterCookie
          return yield* votes.ranking(voter)
        }),
      )
      .handle("vote", ({ payload }) =>
        Effect.gen(function* () {
          const voter = yield* CurrentVoter
          if (Voter.$is("Tampered")(voter)) yield* clearVoterCookie
          const { issued, ...outcome } = yield* votes.vote(voter, payload)
          yield* Option.match(issued, {
            onNone: () => Effect.void,
            onSome: setVoterCookie,
          })
          return outcome
        }),
      )
  }),
)
