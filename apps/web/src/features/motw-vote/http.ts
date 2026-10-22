import { getCollection } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import * as ModuleContent from "@/features/module-of-the-week/astro-content"
import { Modules } from "@/features/module-of-the-week/service"
import { ApiContentError, ApiReferenceContent, VoteData } from "./vote-data"

const API_VERSION = "v4"

const ApiContent = Layer.succeed(ApiReferenceContent, {
  entries: Effect.tryPromise({
    try: async () =>
      (
        await getCollection(
          "apiReference",
          ({ data }) => data.version === API_VERSION,
        )
      ).map(({ data }) => data),
    catch: (cause) => new ApiContentError({ cause }),
  }),
})

/** `VoteData`, with the `Modules` it reads, from Astro's content. */
export const layer = VoteData.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      ApiContent,
      Modules.layer.pipe(Layer.provide(ModuleContent.layer)),
    ),
  ),
)

const runtime = ManagedRuntime.make(layer)

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
