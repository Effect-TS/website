import { getCollection } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ModuleContent from "@/features/module-of-the-week/astro-content"
import { Modules } from "@/features/module-of-the-week/service"
import { ApiContentError, ApiModules, ApiReferenceContent } from "./api-modules"
import { VoteData } from "./vote-data"

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

/** `VoteData`, with the `Modules` and `ApiModules` it reads, from Astro's content. */
export const layer = VoteData.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      ApiModules.layer.pipe(Layer.provide(ApiContent)),
      Modules.layer.pipe(Layer.provide(ModuleContent.layer)),
    ),
  ),
)
