import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"

export class LlmsContentError extends Data.TaggedError("LlmsContentError")<{
  readonly cause: unknown
}> {}

export class LlmsScopeNotFound extends Data.TaggedError("LlmsScopeNotFound")<{
  readonly kind: string
}> {}

export interface LlmsPage {
  readonly title: string
  readonly description: string | undefined
  /** Site path of the HTML page. Its markdown twin is `${path}.md`. */
  readonly path: string
  /** Lazy: only the `llms-full` files need it. Memoized by the page. */
  readonly markdown: () => string
}

export interface LlmsSection {
  readonly title: string
  readonly pages: ReadonlyArray<LlmsPage>
}

/**
 * A group of pages with its own `llms.txt` and `llms-full.txt`, served under
 * `path`. Every content source (docs, changelog, ...) provides scopes.
 */
export interface LlmsScope {
  readonly kind: string
  /** Route params that select this scope among scopes of the same kind. */
  readonly params: Readonly<Record<string, string>>
  readonly path: string
  readonly title: string
  readonly summary: string
  readonly inRootFull: boolean
  readonly sections: Effect.Effect<ReadonlyArray<LlmsSection>, LlmsContentError>
}
