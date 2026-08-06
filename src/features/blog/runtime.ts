/**
 * Import direction for this feature:
 *
 *   collection.ts ──────────────► (only) src/content.config.ts
 *   domain.ts ◄── repository.ts ◄── queries.ts ◄── runtime.ts ◄── *.astro / rss.xml.ts
 *   domain.ts ◄── components/BlogAtoms.ts ◄── components/*.tsx
 *
 * `astro:content` is a Vite virtual module plain vitest cannot resolve.
 * Exactly two files may import it at runtime: `collection.ts` and this one.
 *
 * The astro-backed `BlogRepository` layer is not exported — it's built and
 * provided right here, inside `runBlog`, on every call. `astro:content` isn't
 * agnostic (it only resolves in Astro's SSR/SSG graph), so nothing about it
 * should be a shared, importable value that other code could provide from a
 * context where it doesn't actually apply.
 */
import { getCollection } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { BlogQueries } from "./queries"
import { BlogContentError, BlogRepository } from "./repository"

type BlogCollectionName = "blog" | "blogTags" | "blogAuthors"

const load = <K extends BlogCollectionName>(collection: K) =>
  Effect.tryPromise({
    try: () => getCollection(collection),
    catch: (cause) => new BlogContentError({ collection, cause }),
  })

export const runBlog = <A, E>(effect: Effect.Effect<A, E, BlogQueries>): Promise<A> => {
  const layer = BlogQueries.layer.pipe(
    Layer.provide(
      Layer.succeed(BlogRepository, {
        posts: load("blog"),
        tags: load("blogTags"),
        authors: load("blogAuthors"),
      }),
    ),
  )
  return Effect.runPromise(effect.pipe(Effect.provide(layer), Effect.tapCause(Effect.logError)))
}
