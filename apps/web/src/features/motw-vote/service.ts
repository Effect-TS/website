import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { VoteRefusedError } from "./api"
import { ModuleCatalog } from "./catalog"
import { RANKING_LIMIT } from "./domain"
import { Turnstile } from "./turnstile"
import { VoteStore } from "./vote-store"

export class MotwVotes extends Context.Service<MotwVotes>()(
  "website/MotwVotes",
  {
    make: Effect.gen(function* () {
      const store = yield* VoteStore
      const catalog = yield* ModuleCatalog
      const turnstile = yield* Turnstile

      const ranking = Effect.fn("MotwVotes.ranking")(function* (voter: string) {
        const [requests, voted] = yield* Effect.all([
          store.top(RANKING_LIMIT),
          store.votedBy(voter),
        ])
        return { requests, voted, turnstileSiteKey: turnstile.siteKey }
      }, Effect.orDie)

      const vote = Effect.fn("MotwVotes.vote")(
        function* (
          voter: string,
          id: string,
          on: boolean,
          token: string | undefined,
        ) {
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
          CatalogError: Effect.die,
          TurnstileError: Effect.die,
          VoteStoreError: Effect.die,
        }),
      )

      return { ranking, vote } as const
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
