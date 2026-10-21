import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { VoteRefusedError } from "./api"
import { ModuleCatalog, type CatalogError } from "./catalog"
import { Turnstile, type TurnstileError } from "./turnstile"
import { NIL_VOTER } from "./voter"
import { VoteStore, type VoteStoreError } from "./vote-store"

const fatal = (error: CatalogError | TurnstileError | VoteStoreError) =>
  Effect.logError("MotwVotes failed", error).pipe(
    Effect.andThen(Effect.die(error)),
  )

export class MotwVotes extends Context.Service<MotwVotes>()(
  "website/MotwVotes",
  {
    make: Effect.gen(function* () {
      const store = yield* VoteStore
      const catalog = yield* ModuleCatalog
      const turnstile = yield* Turnstile

      const isVotable = (id: string) =>
        catalog.status(id).pipe(Effect.map((status) => status === "votable"))

      const ranking = Effect.fn("MotwVotes.ranking")(
        function* (voter: string) {
          const [top, votedBy] = yield* Effect.all([
            store.top(),
            store.votedBy(voter),
          ])
          const [requests, voted] = yield* Effect.all([
            Effect.filter(top, ({ id }) => isVotable(id)),
            Effect.filter(votedBy, isVotable),
          ])
          return { requests, voted, turnstileSiteKey: turnstile.siteKey }
        },
        Effect.catchTags({
          CatalogError: fatal,
          VoteStoreError: fatal,
        }),
      )

      const vote = Effect.fn("MotwVotes.vote")(
        function* (
          voter: string,
          id: string,
          on: boolean,
          token: string | undefined,
        ) {
          if (voter === NIL_VOTER) {
            if (on)
              return yield* new VoteRefusedError({ reason: "InvalidVoter" })
            return { id, votes: 0, voted: false }
          }
          if (on) {
            const status = yield* catalog.status(id)
            if (status === "covered")
              return yield* new VoteRefusedError({ reason: "Covered" })
            if (status === "unknown")
              return yield* new VoteRefusedError({ reason: "UnknownModule" })
            if (token === undefined || !(yield* turnstile.verify(token))) {
              return yield* new VoteRefusedError({ reason: "ChallengeFailed" })
            }
          }
          return yield* store.vote(voter, id, on)
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
