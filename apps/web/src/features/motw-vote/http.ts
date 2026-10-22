import * as Effect from "effect/Effect"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import { Modules } from "@/features/module-of-the-week/service"
import * as AstroContent from "./astro-content"
import { VoteData } from "./vote-data"

const runtime = ManagedRuntime.make(AstroContent.layer)

/** What the Module of the Week page reads: the intro, the modules, and the vote data. */
export const getMotwPage = () =>
  runtime.runPromise(
    Effect.gen(function* () {
      const modules = yield* Modules
      const voteData = yield* VoteData
      const page = yield* Effect.all(
        {
          intro: modules.intro,
          modules: modules.latest,
          vote: voteData.snapshot,
        },
        { concurrency: "unbounded" },
      )
      return { ...page, intro: Option.getOrUndefined(page.intro) }
    }),
  )

export const getVoteData = () =>
  runtime.runPromise(VoteData.use((voteData) => voteData.data))
