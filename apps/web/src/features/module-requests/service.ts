import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Modules } from "@/features/module-of-the-week/service"
import { VoteRefusedError } from "./api"
import { ModuleCatalog } from "./catalog"
import { RANKING_LIMIT, VOTE_CAP } from "./domain"
import { Turnstile } from "./turnstile"
import { VoteStore } from "./vote-store"

export class ModuleVotes extends Context.Service<ModuleVotes>()(
  "website/ModuleVotes",
  {
    make: Effect.gen(function* () {
      const store = yield* VoteStore
      const catalog = yield* ModuleCatalog
      const modules = yield* Modules
      const turnstile = yield* Turnstile

      // The modules the series covered, from the frontmatter of its posts
      const covered = Effect.map(modules.modules, (all) =>
        all.flatMap(({ post }) => post.data.apiModules ?? []),
      )

      const ranking = Effect.fn("ModuleVotes.ranking")(function* (
        voter: string,
      ) {
        const [requests, voted] = yield* Effect.all([
          store.top(RANKING_LIMIT),
          store.votedBy(voter),
        ])
        return { requests, voted, turnstileSiteKey: turnstile.siteKey }
      }, Effect.orDie)

      const vote = Effect.fn("ModuleVotes.vote")(
        function* (
          voter: string,
          id: string,
          on: boolean,
          token: string | undefined,
        ) {
          if (on) {
            if ((yield* covered).includes(id))
              return yield* new VoteRefusedError({ reason: "Covered" })
            if (!(yield* catalog.has(id))) {
              return yield* new VoteRefusedError({ reason: "UnknownModule" })
            }
            if (token === undefined || !(yield* turnstile.verify(token))) {
              return yield* new VoteRefusedError({ reason: "ChallengeFailed" })
            }
          }
          const outcome = yield* store.vote(voter, id, on, VOTE_CAP)
          if (on && !outcome.voted)
            return yield* new VoteRefusedError({ reason: "VoteLimit" })
          return outcome
        },
        Effect.catchTags({
          CatalogError: Effect.die,
          ModuleContentError: Effect.die,
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
