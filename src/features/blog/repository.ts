import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
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
 * only the service key and shape — the `getCollection`-backed implementation
 * lives in `./runtime`, which nothing in the pure import graph (`./domain`,
 * `./queries`, this file) ever imports. Tests provide their own fixture
 * layers inline via `Layer.succeed(BlogRepository, {...})`.
 *
 * That's also why this doesn't use the `Context.Service<...>()("Id", { make })`
 * + `static layer = Layer.effect(this, this.make)` pattern used elsewhere in
 * this repo (see `youtube-embed/service.ts`): `make` would have to import
 * `astro:content`, poisoning this file for tests. The key is declared bare
 * instead, with the implementation provided as a free layer where it's used.
 */
export class BlogRepository extends Context.Service<
  BlogRepository,
  {
    readonly posts: Effect.Effect<ReadonlyArray<BlogPostSource>, BlogContentError>
    readonly tags: Effect.Effect<ReadonlyArray<BlogTagSource>, BlogContentError>
    readonly authors: Effect.Effect<ReadonlyArray<BlogAuthorSource>, BlogContentError>
  }
>()("BlogRepository") {}
