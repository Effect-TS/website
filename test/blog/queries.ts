import type { ImageMetadata } from "astro"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import type { BlogAuthorSource, BlogPostSource, BlogTagSource } from "@/features/blog/domain"
import { BlogQueries } from "@/features/blog/queries"
import { BlogContentError, BlogRepository } from "@/features/blog/repository"

// This file imports `queries.ts`, which must never transitively import
// `astro:content`. If it did, vitest would fail to resolve the module and
// every test below would error — that failure mode is itself the boundary
// guard described in `runtime.ts`.

const tagSources: ReadonlyArray<BlogTagSource> = [
  { id: "all", data: { name: "All" } },
  { id: "releases", data: { name: "Releases" } },
  { id: "effect", data: { name: "Effect" } },
  { id: "typescript", data: { name: "TypeScript" } },
  { id: "this-week-in-effect", data: { name: "This Week In Effect" } },
]

const authorSources: ReadonlyArray<BlogAuthorSource> = [
  {
    id: "maxwell_brown",
    data: { name: "Maxwell Brown", title: "Founding Engineer", url: "https://effect.website" },
  },
]

function makeSource(options: {
  readonly id: string
  readonly date: string
  readonly tags?: ReadonlyArray<string>
  readonly featured?: boolean
  readonly featuredImage?: ImageMetadata
}): BlogPostSource {
  return {
    id: options.id,
    data: {
      title: `Title ${options.id}`,
      excerpt: `Excerpt ${options.id}`,
      date: new Date(options.date),
      tags: (options.tags ?? ["releases"]).map((id) => ({ id })),
      authors: [{ id: "maxwell_brown" }],
      featured: options.featured ?? false,
      featuredImage: options.featuredImage,
    },
  }
}

function testQueries(fixtures: {
  readonly posts?: ReadonlyArray<BlogPostSource> | undefined
  readonly tags?: ReadonlyArray<BlogTagSource> | undefined
  readonly authors?: ReadonlyArray<BlogAuthorSource> | undefined
}) {
  return BlogQueries.layer.pipe(
    Layer.provide(
      Layer.succeed(BlogRepository, {
        posts: Effect.succeed(fixtures.posts ?? []),
        tags: Effect.succeed(fixtures.tags ?? []),
        authors: Effect.succeed(fixtures.authors ?? []),
      }),
    ),
  )
}

describe("BlogQueries.listing", () => {
  it.effect("excludes the featured post from the grid and plumbs its image through", () =>
    Effect.gen(function* () {
      const fakeImage = { src: "/featured.png" } as unknown as ImageMetadata
      const layer = testQueries({
        posts: [
          makeSource({
            id: "featured",
            date: "2024-02-01T00:00:00Z",
            featured: true,
            featuredImage: fakeImage,
          }),
          makeSource({ id: "other", date: "2024-01-01T00:00:00Z" }),
        ],
        tags: tagSources,
        authors: authorSources,
      })
      const data = yield* BlogQueries.use((queries) => queries.listing).pipe(Effect.provide(layer))

      expect(data.featured?.post.id).toBe("featured")
      expect(data.featured?.image).toBe(fakeImage)
      expect(data.posts.map((post) => post.id)).toEqual(["other"])
    }),
  )

  it.effect("returns no featured post and keeps the full grid when nothing is featured", () =>
    Effect.gen(function* () {
      const layer = testQueries({
        posts: [makeSource({ id: "a", date: "2024-01-01T00:00:00Z" })],
        tags: tagSources,
        authors: authorSources,
      })
      const data = yield* BlogQueries.use((queries) => queries.listing).pipe(Effect.provide(layer))

      expect(data.featured).toBeUndefined()
      expect(data.posts.map((post) => post.id)).toEqual(["a"])
    }),
  )

  it.effect("picks the newest of multiple featured posts", () =>
    Effect.gen(function* () {
      const layer = testQueries({
        posts: [
          makeSource({ id: "old", date: "2024-01-01T00:00:00Z", featured: true }),
          makeSource({ id: "new", date: "2024-02-01T00:00:00Z", featured: true }),
        ],
        tags: tagSources,
        authors: authorSources,
      })
      const data = yield* BlogQueries.use((queries) => queries.listing).pipe(Effect.provide(layer))

      expect(data.featured?.post.id).toBe("new")
      // Only the chosen (newest) featured post is excluded from the grid —
      // a losing duplicate still shows up there, since it isn't in the hero.
      expect(data.posts.map((post) => post.id)).toEqual(["old"])
    }),
  )

  it.effect("every category count is consistent with the grid it filters", () =>
    Effect.gen(function* () {
      const layer = testQueries({
        posts: [
          makeSource({ id: "a", date: "2024-01-01T00:00:00Z", tags: ["releases"] }),
          makeSource({ id: "b", date: "2024-01-02T00:00:00Z", tags: ["this-week-in-effect"] }),
          makeSource({ id: "c", date: "2024-01-03T00:00:00Z", tags: ["releases", "effect"] }),
        ],
        tags: tagSources,
        authors: authorSources,
      })
      const data = yield* BlogQueries.use((queries) => queries.listing).pipe(Effect.provide(layer))

      const allSummary = data.categories.find((category) => category.id === "all")
      const releasesSummary = data.categories.find((category) => category.id === "releases")
      expect(data.categories[0]?.id).toBe("all")
      // "b" is TWIE, so "all" (which excludes TWIE) counts only "a" and "c".
      expect(allSummary?.count).toBe(2)
      expect(releasesSummary?.count).toBe(2)
    }),
  )
})

describe("BlogQueries.postPages", () => {
  it.effect("returns one page per post with correct prev/next orientation", () =>
    Effect.gen(function* () {
      const layer = testQueries({
        posts: [
          makeSource({ id: "newest", date: "2024-03-01T00:00:00Z" }),
          makeSource({ id: "middle", date: "2024-02-01T00:00:00Z" }),
          makeSource({ id: "oldest", date: "2024-01-01T00:00:00Z" }),
        ],
        tags: tagSources,
        authors: authorSources,
      })
      const pages = yield* BlogQueries.use((queries) => queries.postPages).pipe(
        Effect.provide(layer),
      )

      expect(pages.map((page) => page.id)).toEqual(["newest", "middle", "oldest"])

      const middle = pages.find((page) => page.id === "middle")
      expect(middle?.previous?.id).toBe("oldest")
      expect(middle?.next?.id).toBe("newest")

      const newest = pages.find((page) => page.id === "newest")
      expect(newest?.next).toBeUndefined()

      const oldest = pages.find((page) => page.id === "oldest")
      expect(oldest?.previous).toBeUndefined()
    }),
  )

  it.effect("evaluates BlogRepository.posts exactly once regardless of post count", () =>
    Effect.gen(function* () {
      const counter = { calls: 0 }
      const sources = Array.from({ length: 5 }, (_, index) =>
        makeSource({ id: `post-${index}`, date: `2024-01-0${index + 1}T00:00:00Z` }),
      )
      const countingLayer = BlogQueries.layer.pipe(
        Layer.provide(
          Layer.succeed(BlogRepository, {
            posts: Effect.sync(() => {
              counter.calls++
              return sources
            }),
            tags: Effect.succeed(tagSources),
            authors: Effect.succeed(authorSources),
          }),
        ),
      )

      const pages = yield* BlogQueries.use((queries) => queries.postPages).pipe(
        Effect.provide(countingLayer),
      )

      expect(pages.length).toBe(5)
      expect(counter.calls).toBe(1)
    }),
  )
})

describe("BlogQueries.feed", () => {
  it.effect("returns newest-first items with escaped author names and no trailing slash", () =>
    Effect.gen(function* () {
      const layer = testQueries({
        posts: [
          makeSource({ id: "old", date: "2024-01-01T00:00:00Z" }),
          makeSource({ id: "new", date: "2024-02-01T00:00:00Z" }),
        ],
        tags: tagSources,
        authors: [
          {
            id: "maxwell_brown",
            data: { name: "Tim & Bob", title: "Founding Engineer", url: "https://effect.website" },
          },
        ],
      })
      const items = yield* BlogQueries.use((queries) => queries.feed).pipe(Effect.provide(layer))

      expect(items.map((item) => item.link)).toEqual(["/blog/new", "/blog/old"])
      expect(items[0]?.customData).toBe("<author>Tim &amp; Bob</author>")
    }),
  )
})

describe("error propagation", () => {
  it.effect("fails every query with the repository's error", () =>
    Effect.gen(function* () {
      const error = new BlogContentError({ collection: "blog", cause: "boom" })
      const layer = BlogQueries.layer.pipe(
        Layer.provide(
          Layer.succeed(BlogRepository, {
            posts: Effect.fail(error),
            tags: Effect.fail(error),
            authors: Effect.fail(error),
          }),
        ),
      )

      const indexExit = yield* Effect.exit(
        BlogQueries.use((queries) => queries.listing).pipe(Effect.provide(layer)),
      )
      const pagesExit = yield* Effect.exit(
        BlogQueries.use((queries) => queries.postPages).pipe(Effect.provide(layer)),
      )
      const feedExit = yield* Effect.exit(
        BlogQueries.use((queries) => queries.feed).pipe(Effect.provide(layer)),
      )

      expect(Exit.isFailure(indexExit)).toBe(true)
      expect(Exit.isFailure(pagesExit)).toBe(true)
      expect(Exit.isFailure(feedExit)).toBe(true)
    }),
  )
})
