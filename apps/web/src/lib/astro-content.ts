import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class AstroContentError extends Data.TaggedError("AstroContentError")<{
  readonly collection: string
  readonly cause: unknown
}> {}

/**
 * Astro content collections as an Effect service, so code that reads content
 * can run against fake collections in tests.
 */
export class AstroContent extends Context.Service<
  AstroContent,
  {
    readonly collection: <C extends CollectionKey>(
      name: C,
      filter?: (entry: CollectionEntry<C>) => boolean,
    ) => Effect.Effect<Array<CollectionEntry<C>>, AstroContentError>
  }
>()("app/AstroContent") {
  static readonly layer = Layer.succeed(this, {
    collection: (name, filter) =>
      Effect.tryPromise({
        try: () => getCollection(name, filter),
        catch: (cause) => new AstroContentError({ collection: name, cause }),
      }).pipe(
        Effect.withSpan("AstroContent.collection", { attributes: { name } }),
      ),
  })
}
