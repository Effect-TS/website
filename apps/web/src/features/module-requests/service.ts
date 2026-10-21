import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { VoteRefusedError } from "./api"
import { ModuleCatalog } from "./catalog"
import { COVERED_MODULE_IDS } from "./covered"
import { RANKING_LIMIT, VOTE_CAP } from "./domain"
import { VoteStore } from "./vote-store"

export class ModuleVotes extends Context.Service<ModuleVotes>()(
  "website/ModuleVotes",
  {
    make: Effect.gen(function* () {
      const store = yield* VoteStore
      const catalog = yield* ModuleCatalog
      const covered = new Set(COVERED_MODULE_IDS)

      const ranking = Effect.fn("ModuleVotes.ranking")(function* (
        voter: string,
      ) {
        const [requests, voted] = yield* Effect.all([
          store.top(RANKING_LIMIT),
          store.votedBy(voter),
        ])
        return { requests, voted }
      }, Effect.orDie)

      const vote = Effect.fn("ModuleVotes.vote")(
        function* (voter: string, id: string, on: boolean) {
          if (on) {
            if (covered.has(id))
              return yield* new VoteRefusedError({ reason: "Covered" })
            if (!(yield* catalog.has(id))) {
              return yield* new VoteRefusedError({ reason: "UnknownModule" })
            }
          }
          const outcome = yield* store.vote(voter, id, on, VOTE_CAP)
          if (on && !outcome.voted)
            return yield* new VoteRefusedError({ reason: "VoteLimit" })
          return outcome
        },
        Effect.catchTags({
          CatalogError: Effect.die,
          VoteStoreError: Effect.die,
        }),
      )

      return { ranking, vote } as const
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
