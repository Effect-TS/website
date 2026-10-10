import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { LlmsContentError } from "./domain"

export interface Doc {
  readonly id: string
  readonly title: string
  readonly description: string | undefined
  readonly body: string
}

export interface DocGroup {
  readonly label: string
  readonly docs: ReadonlyArray<Doc>
}

/** Where llms files read site content from. Astro provides the live layer. */
export class LlmsContent extends Context.Service<
  LlmsContent,
  {
    /** Listed docs of one version, grouped and ordered like the sidebar. */
    readonly docGroups: (
      version: string,
    ) => Effect.Effect<ReadonlyArray<DocGroup>, LlmsContentError>
  }
>()("website/LlmsContent") {}
