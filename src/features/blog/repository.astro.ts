import { getCollection } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { BlogContentError, BlogRepository } from "./repository"

type BlogCollectionName = "blog" | "blogTags" | "blogAuthors"

const load = <K extends BlogCollectionName>(collection: K) =>
  Effect.tryPromise({
    try: () => getCollection(collection),
    catch: (cause) => new BlogContentError({ collection, cause }),
  })

/**
 * The only file in the feature (besides `./collection`) that imports
 * `astro:content` — see the boundary note on `BlogRepository`.
 *
 * No `getEntries`: reference resolution happens in bulk, in
 * `domain.assembleBlogPosts`, instead of per-post.
 */
export const layerAstroContent = Layer.succeed(BlogRepository, {
  posts: load("blog"),
  tags: load("blogTags"),
  authors: load("blogAuthors"),
})
