import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { ModuleCatalog } from "./catalog"
import { VoteRefusedError } from "./errors"
import { Voter } from "./middleware"
import { Turnstile } from "./turnstile"
import { VoterSigner } from "./voter"
import { VoteStore } from "./vote-store"

const fatal = (error: unknown) =>
  Effect.logError(error).pipe(Effect.andThen(Effect.die(error)))

export interface VoteResult {
  readonly id: string
  readonly votes: number
  readonly voted: boolean
  /** The cookie value of a voter issued by this vote. */
  readonly issued: Option.Option<string>
}

export class MotwVotes extends Context.Service<MotwVotes>()(
  "website/MotwVotes",
  {
    make: Effect.gen(function* () {
      const store = yield* VoteStore
      const catalog = yield* ModuleCatalog
      const turnstile = yield* Turnstile
      const signer = yield* VoterSigner

      const isVotable = (id: string) =>
        Effect.map(catalog.status(id), (status) => status === "votable")

      const ranking = Effect.fn("MotwVotes.ranking")(
        function* (voter: Voter) {
          const [requests, voted] = yield* Effect.all([
            store.top(),
            Voter.$match(voter, {
              Known: ({ id }) => store.votedBy(id),
              Anonymous: () => Effect.succeed([]),
              Tampered: () => Effect.succeed([]),
            }),
          ])
          return {
            requests: yield* Effect.filter(requests, ({ id }) => isVotable(id)),
            voted: yield* Effect.filter(voted, isVotable),
            turnstileSiteKey: turnstile.siteKey,
          }
        },
        Effect.catchTags({
          CatalogError: fatal,
          VoteStoreError: fatal,
        }),
      )

      const add = Effect.fn("MotwVotes.add")(function* (
        known: Option.Option<string>,
        id: string,
        token: string | undefined,
      ) {
        const status = yield* catalog.status(id)
        if (status !== "votable") {
          return yield* new VoteRefusedError({
            reason: status === "covered" ? "Covered" : "UnknownModule",
          })
        }
        if (token === undefined || !(yield* turnstile.verify(token))) {
          return yield* new VoteRefusedError({ reason: "ChallengeFailed" })
        }
        const voter = yield* Option.match(known, {
          onSome: (voterId) =>
            Effect.succeed({ id: voterId, issued: Option.none<string>() }),
          onNone: () =>
            Effect.map(signer.issue, ({ id: voterId, token: issued }) => ({
              id: voterId,
              issued: Option.some(issued),
            })),
        })
        const outcome = yield* store.vote(voter.id, id, true)
        return { ...outcome, issued: voter.issued }
      })

      const vote = Effect.fn("MotwVotes.vote")(
        function* (
          voter: Voter,
          input: {
            readonly id: string
            readonly on: boolean
            readonly token?: string | undefined
          },
        ) {
          return yield* Voter.$match(voter, {
            Tampered: () =>
              Effect.fail(new VoteRefusedError({ reason: "InvalidVoter" })),
            Anonymous: () =>
              input.on
                ? add(Option.none(), input.id, input.token)
                : Effect.succeed({
                    id: input.id,
                    votes: 0,
                    voted: false,
                    issued: Option.none<string>(),
                  }),
            Known: ({ id }) =>
              input.on
                ? add(Option.some(id), input.id, input.token)
                : Effect.map(store.vote(id, input.id, false), (outcome) => ({
                    ...outcome,
                    issued: Option.none<string>(),
                  })),
          })
        },
        Effect.catchTags({
          CatalogError: fatal,
          TurnstileError: fatal,
          VoteStoreError: fatal,
        }),
      )

      return { ranking, vote } as const
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
