import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { BlogAuthorSource, BlogPostSource, BlogTagSource } from "./domain"

export class BlogContentError extends Data.TaggedError("BlogContentError")<{
  readonly collection: "blog" | "blogTags" | "blogAuthors"
  readonly cause: unknown
}> {
  override get message(): string {
    return `Failed to load the '${this.collection}' content collection`
  }
}

/**
 * The blog content data source, as an injectable service. `astro:content` is
 * a Vite virtual module plain vitest cannot resolve, so this file declares
 * only the service key, shape, and test layers — the `getCollection`-backed
 * implementation lives in `./repository.astro`, which nothing in the pure
 * import graph (`./domain`, `./queries`, this file) ever imports.
 *
 * That's also why this doesn't use the `Context.Service<...>()("Id", { make })`
 * + `static layer = Layer.effect(this, this.make)` pattern used elsewhere in
 * this repo (see `youtube-embed/service.ts`): `make` would have to import
 * `astro:content`, poisoning this file for tests. The key is declared bare
 * instead, with implementations as free layers in sibling files.
 */
export class BlogRepository extends Context.Service<
  BlogRepository,
  {
    readonly posts: Effect.Effect<ReadonlyArray<BlogPostSource>, BlogContentError>
    readonly tags: Effect.Effect<ReadonlyArray<BlogTagSource>, BlogContentError>
    readonly authors: Effect.Effect<ReadonlyArray<BlogAuthorSource>, BlogContentError>
  }
>()("BlogRepository") {
  static readonly layerTest = (fixtures: {
    readonly posts?: ReadonlyArray<BlogPostSource> | undefined
    readonly tags?: ReadonlyArray<BlogTagSource> | undefined
    readonly authors?: ReadonlyArray<BlogAuthorSource> | undefined
  }) =>
    Layer.succeed(this, {
      posts: Effect.succeed(fixtures.posts ?? []),
      tags: Effect.succeed(fixtures.tags ?? []),
      authors: Effect.succeed(fixtures.authors ?? []),
    })

  static readonly layerFailing = (error: BlogContentError) =>
    Layer.succeed(this, {
      posts: Effect.fail(error),
      tags: Effect.fail(error),
      authors: Effect.fail(error),
    })
}
