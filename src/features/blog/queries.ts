import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type {
  BlogCategorySummary,
  BlogFeatured,
  BlogFeedPost,
  BlogPost,
  BlogPostLink,
  BlogPostSummary,
  BlogReferenceError,
  BlogTag,
} from "./domain"
import type { BlogContentError } from "./repository"
import {
  assembleBlogPosts,
  blogPostNeighbors,
  buildBlogCategorySummaries,
  selectFeaturedPost,
  selectGridPosts,
  sortBlogTagsByName,
  toBlogFeedPost,
  toBlogPostSummary,
} from "./domain"
import { BlogRepository } from "./repository"

interface BlogListing {
  readonly featured: BlogFeatured | undefined
  /** Grid posts — the featured post is excluded. */
  readonly posts: ReadonlyArray<BlogPostSummary>
  readonly categories: ReadonlyArray<BlogCategorySummary>
}

interface BlogPostPage {
  readonly id: string
  readonly post: BlogPost
  readonly sortedTags: ReadonlyArray<BlogTag>
  /** The OLDER post. */
  readonly previous: BlogPostLink | undefined
  /** The NEWER post. */
  readonly next: BlogPostLink | undefined
}

/**
 * The blog use cases, backed by `BlogRepository`. Depends only on the
 * repository interface, so tests provide it with an inline fixture layer
 * (`Layer.succeed(BlogRepository, {...})`) without ever touching `astro:content`.
 */
export class BlogQueries extends Context.Service<
  BlogQueries,
  {
    readonly listing: Effect.Effect<BlogListing, BlogContentError | BlogReferenceError>
    readonly postPages: Effect.Effect<
      ReadonlyArray<BlogPostPage>,
      BlogContentError | BlogReferenceError
    >
    readonly feed: Effect.Effect<ReadonlyArray<BlogFeedPost>, BlogContentError | BlogReferenceError>
  }
>()("BlogQueries", {
  make: Effect.gen(function* () {
    const repository = yield* BlogRepository

    const loadPosts = Effect.gen(function* () {
      const [sources, tagRows, authors] = yield* Effect.all(
        [repository.posts, repository.tags, repository.authors],
        { concurrency: "unbounded" },
      )
      const posts = yield* Effect.fromResult(assembleBlogPosts(sources, tagRows, authors))
      return { posts, sources, tagRows }
    })

    const listing = Effect.gen(function* () {
      const { posts, sources, tagRows } = yield* loadPosts
      const { post: featuredPost, duplicates } = selectFeaturedPost(posts)

      if (duplicates.length > 1) {
        yield* Effect.logWarning(
          `[blog] multiple posts marked featured (${duplicates.length}): ` +
            duplicates.map((post) => post.id).join(", ") +
            " — using newest",
        )
      }

      const featuredImage = featuredPost
        ? sources.find((source) => source.id === featuredPost.id)?.data.featuredImage
        : undefined
      const gridPosts = selectGridPosts(posts, featuredPost)

      return {
        featured: featuredPost ? { post: featuredPost, image: featuredImage } : undefined,
        posts: gridPosts.map(toBlogPostSummary),
        categories: buildBlogCategorySummaries(gridPosts, tagRows),
      }
    })

    const postPages = Effect.gen(function* () {
      const { posts } = yield* loadPosts
      return posts.map((post) => {
        const neighbors = blogPostNeighbors(posts, post.id)
        return {
          id: post.id,
          post,
          sortedTags: sortBlogTagsByName(post.tags),
          previous: neighbors.previous,
          next: neighbors.next,
        }
      })
    })

    const feed = Effect.gen(function* () {
      const { posts } = yield* loadPosts
      return posts.map(toBlogFeedPost)
    })

    return { listing, postPages, feed } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
