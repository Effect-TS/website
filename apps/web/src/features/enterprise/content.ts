import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { WeeklyDownloads } from "@/features/npm-downloads/domain"
import type { EnterpriseContentError } from "./domain"

export interface Author {
  readonly name: string
  readonly title: string
  readonly timezone: string | undefined
}

/** Where the enterprise page reads site content from. Astro provides the live layer. */
export class EnterpriseContent extends Context.Service<
  EnterpriseContent,
  {
    readonly author: (
      id: string,
    ) => Effect.Effect<Author, EnterpriseContentError>
    /** URL of an optimized avatar for a blog author. */
    readonly avatar: (
      id: string,
    ) => Effect.Effect<string, EnterpriseContentError>
    /** Latest `effect` version of the v4 API reference. */
    readonly effectVersion: Effect.Effect<string, EnterpriseContentError>
    readonly weeklyDownloads: Effect.Effect<
      ReadonlyArray<WeeklyDownloads>,
      EnterpriseContentError
    >
  }
>()("app/EnterpriseContent") {}
