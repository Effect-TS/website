import { getCollection, getEntry } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { ModuleContent } from "./content"
import { INTRO_ID, MODULE_PREFIX, ModuleContentError } from "./domain"

const load = <A>(try_: () => Promise<A>) =>
  Effect.tryPromise({
    try: try_,
    catch: (cause) => new ModuleContentError({ cause }),
  })

export const layer = Layer.succeed(ModuleContent, {
  posts: load(() =>
    getCollection("blog", ({ id }) => id.startsWith(MODULE_PREFIX)),
  ),
  intro: load(async () => await getEntry("blog", INTRO_ID)).pipe(
    Effect.map(Option.fromUndefinedOr),
  ),
})
