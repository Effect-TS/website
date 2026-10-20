import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type { ModuleContentError, ModulePost } from "./domain"

/** Where Module of the Week reads its posts from. Astro provides the live layer. */
export class ModuleContent extends Context.Service<
  ModuleContent,
  {
    /** Every module post, in no particular order. */
    readonly posts: Effect.Effect<ReadonlyArray<ModulePost>, ModuleContentError>
    /** The post that introduces the series. It is not a module. */
    readonly intro: Effect.Effect<Option.Option<ModulePost>, ModuleContentError>
  }
>()("website/ModuleContent") {}
