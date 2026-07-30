import type { ImageMetadata } from "astro"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

export const BlogPostId = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(Schema.brand("BlogPostId"))
export type BlogPostId = typeof BlogPostId.Type

export const BlogTagId = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(Schema.brand("BlogTagId"))
export type BlogTagId = typeof BlogTagId.Type

export const BlogAuthorId = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
  Schema.brand("BlogAuthorId"),
)
export type BlogAuthorId = typeof BlogAuthorId.Type

/**
 * Single source of truth for the "This Week in Effect" tag id: every filter,
 * count, and URL codec below matches on this constant instead of the string
 * literal.
 */
export const TwieTagId: BlogTagId = BlogTagId.make("this-week-in-effect")

/** The URL query-param value for the synthetic "all" filter row in `tags.json`. */
export const AllCategoryParam = "all"

/**
 * A blog post filter. `"all"` isn't a tag — it's a filter mode that happens
 * to have a display row in `tags.json` — so it's a case here rather than a
 * string compared against at every call site.
 */
export type BlogCategory = Data.TaggedEnum<{
  readonly AllPosts: {}
  readonly ThisWeekInEffect: {}
  readonly Tag: { readonly id: BlogTagId }
}>
export const BlogCategory = Data.taggedEnum<BlogCategory>()

export const SuggestedCategoryIds: ReadonlyArray<BlogTagId> = [
  BlogTagId.make("releases"),
  BlogTagId.make("effect"),
  BlogTagId.make("typescript"),
]

export function blogCategoryFromParam(
  param: string | null,
  validTagIds: ReadonlyArray<string>,
): BlogCategory {
  if (param === null || param === AllCategoryParam) {
    return BlogCategory.AllPosts()
  }
  if (param === TwieTagId) {
    return BlogCategory.ThisWeekInEffect()
  }
  if (validTagIds.includes(param)) {
    return BlogCategory.Tag({ id: BlogTagId.make(param) })
  }
  return BlogCategory.AllPosts()
}

export function blogCategoryToParam(category: BlogCategory): string | undefined {
  return BlogCategory.$match(category, {
    AllPosts: () => undefined,
    ThisWeekInEffect: () => TwieTagId as string,
    Tag: ({ id }) => id as string,
  })
}

export function blogCategoryLabel(
  category: BlogCategory,
  categories: ReadonlyArray<BlogCategorySummary>,
): string {
  const param = blogCategoryToParam(category) ?? AllCategoryParam
  return categories.find((summary) => summary.id === param)?.name ?? "Category"
}

/** Structural shape a `CollectionEntry<"blog">` satisfies — the astro:content boundary. */
export interface BlogPostSource {
  readonly id: string
  readonly data: {
    readonly title: string
    readonly excerpt: string
    readonly date: Date
    readonly tags: ReadonlyArray<{ readonly id: string }>
    readonly authors: ReadonlyArray<{ readonly id: string }>
    readonly featured: boolean
    readonly featuredImage?: ImageMetadata | undefined
  }
}

export interface BlogTagSource {
  readonly id: string
  readonly data: { readonly name: string }
}

export interface BlogAuthorSource {
  readonly id: string
  readonly data: { readonly name: string; readonly title: string; readonly url: string }
}

export class BlogReferenceError extends Data.TaggedError("BlogReferenceError")<{
  readonly postId: string
  readonly kind: "tag" | "author"
  readonly reference: string
}> {
  override get message(): string {
    return `Blog post '${this.postId}' references an unknown ${this.kind}: '${this.reference}'`
  }
}

export class BlogTag extends Schema.Class<BlogTag>("BlogTag")({
  id: BlogTagId,
  name: Schema.String,
}) {}

export class BlogAuthor extends Schema.Class<BlogAuthor>("BlogAuthor")({
  id: BlogAuthorId,
  name: Schema.String,
  title: Schema.String,
  url: Schema.String,
}) {}

export class BlogPost extends Schema.Class<BlogPost>("BlogPost")({
  id: BlogPostId,
  title: Schema.String,
  excerpt: Schema.String,
  publishedOn: Schema.DateTimeUtc,
  tags: Schema.Array(BlogTag),
  authors: Schema.Array(BlogAuthor),
  featured: Schema.Boolean,
}) {
  get href(): string {
    return blogPostHref(this.id)
  }

  get formattedDate(): string {
    return formatBlogDate(this.publishedOn)
  }

  get isThisWeekInEffect(): boolean {
    return this.tags.some((tag) => tag.id === TwieTagId)
  }
}

/**
 * Resolves each source post's `tags`/`authors` references against the
 * bulk-loaded tag/author collections in one pass over each (no per-post
 * `getEntries` round trip). Returns newest-first.
 */
export function assembleBlogPosts(
  sources: ReadonlyArray<BlogPostSource>,
  tagSources: ReadonlyArray<BlogTagSource>,
  authorSources: ReadonlyArray<BlogAuthorSource>,
): Result.Result<ReadonlyArray<BlogPost>, BlogReferenceError> {
  const tagsById = new Map(tagSources.map((tag) => [tag.id, tag]))
  const authorsById = new Map(authorSources.map((author) => [author.id, author]))
  const posts: Array<BlogPost> = []

  for (const source of sources) {
    const tags: Array<BlogTag> = []
    for (const ref of source.data.tags) {
      const tag = tagsById.get(ref.id)
      if (!tag) {
        return Result.fail(
          new BlogReferenceError({ postId: source.id, kind: "tag", reference: ref.id }),
        )
      }
      tags.push(new BlogTag({ id: BlogTagId.make(tag.id), name: tag.data.name }))
    }

    const authors: Array<BlogAuthor> = []
    for (const ref of source.data.authors) {
      const author = authorsById.get(ref.id)
      if (!author) {
        return Result.fail(
          new BlogReferenceError({ postId: source.id, kind: "author", reference: ref.id }),
        )
      }
      authors.push(
        new BlogAuthor({
          id: BlogAuthorId.make(author.id),
          name: author.data.name,
          title: author.data.title,
          url: author.data.url,
        }),
      )
    }

    posts.push(
      new BlogPost({
        id: BlogPostId.make(source.id),
        title: source.data.title,
        excerpt: source.data.excerpt,
        publishedOn: DateTime.makeUnsafe(source.data.date),
        tags,
        authors,
        featured: source.data.featured,
      }),
    )
  }

  return Result.succeed(sortBlogPostsByDate(posts))
}

/**
 * The hero-featured post plus its optional cover image. Not a field on
 * `BlogPost` — `ImageMetadata` is an Astro build artifact, not blog data —
 * so the index query returns it alongside the post instead.
 */
export interface BlogFeatured {
  readonly post: BlogPost
  readonly image: ImageMetadata | undefined
}

/**
 * The JSON-serializable island-prop shape. A plain interface, not
 * `Schema.Class` — Astro serializes props into an `<astro-island props>`
 * attribute, and a class instance wouldn't survive that round trip. `date`
 * is pre-formatted in UTC on the server so the client never runs `Intl`.
 */
export interface BlogPostSummary {
  readonly id: string
  readonly title: string
  readonly excerpt: string
  readonly date: string
  readonly dateMs: number
  readonly tags: ReadonlyArray<{ readonly id: string; readonly name: string }>
}

export interface BlogCategorySummary {
  readonly id: string
  readonly name: string
  readonly count: number
}

export type BlogSortOrder = "newest" | "oldest"

export function formatBlogDate(publishedOn: DateTime.Utc): string {
  return DateTime.formatLocal(publishedOn, {
    locale: "en-US",
    dateStyle: "medium",
    timeZone: "UTC",
  })
}

export function blogPostHref(id: string): string {
  return `/blog/${id}`
}

export function blogPostAbsoluteUrl(id: string, site: URL | undefined): string {
  return new URL(blogPostHref(id), site).href
}

export function blogShareLinks(post: BlogPost, site: URL | undefined) {
  const postUrl = blogPostAbsoluteUrl(post.id, site)
  return {
    postUrl,
    xUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`,
    linkedInUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
  }
}

export function selectPostsForCategory<
  T extends { readonly tags: ReadonlyArray<{ readonly id: string }> },
>(posts: ReadonlyArray<T>, category: BlogCategory): ReadonlyArray<T> {
  return BlogCategory.$match(category, {
    AllPosts: () => posts.filter((post) => !post.tags.some((tag) => tag.id === TwieTagId)),
    ThisWeekInEffect: () => posts.filter((post) => post.tags.some((tag) => tag.id === TwieTagId)),
    Tag: ({ id }) => posts.filter((post) => post.tags.some((tag) => tag.id === id)),
  })
}

/** Always newest-first — the sort order used for the server-rendered list. */
export function sortBlogPostsByDate(posts: ReadonlyArray<BlogPost>): Array<BlogPost> {
  return [...posts].sort(
    (a, b) => DateTime.toEpochMillis(b.publishedOn) - DateTime.toEpochMillis(a.publishedOn),
  )
}

/** Client-controlled sort order over the serialized summary DTO. */
export function sortBlogSummariesByDate(
  summaries: ReadonlyArray<BlogPostSummary>,
  order: BlogSortOrder,
): Array<BlogPostSummary> {
  return [...summaries].sort((a, b) => {
    const comparison = a.dateMs - b.dateMs
    return order === "newest" ? -comparison : comparison
  })
}

export function sortBlogTagsByName(tags: ReadonlyArray<BlogTag>): Array<BlogTag> {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name))
}

export function selectFeaturedPost(posts: ReadonlyArray<BlogPost>) {
  const candidates = posts
    .filter((post) => post.featured && !post.isThisWeekInEffect)
    .sort((a, b) => DateTime.toEpochMillis(b.publishedOn) - DateTime.toEpochMillis(a.publishedOn))

  return {
    post: candidates[0],
    duplicates: candidates.length > 1 ? candidates : [],
  }
}

export function selectGridPosts(
  posts: ReadonlyArray<BlogPost>,
  featured: BlogPost | undefined,
): ReadonlyArray<BlogPost> {
  if (!featured) {
    return posts
  }
  return posts.filter((post) => post.id !== featured.id)
}

/**
 * Single pass over `gridPosts` (the pre-migration version re-filtered the
 * full post list once per tag).
 */
export function buildBlogCategorySummaries(
  gridPosts: ReadonlyArray<BlogPost>,
  tagRows: ReadonlyArray<BlogTagSource>,
): ReadonlyArray<BlogCategorySummary> {
  const countsByTagId = new Map<string, number>()
  let nonTwieCount = 0

  for (const post of gridPosts) {
    if (!post.isThisWeekInEffect) {
      nonTwieCount++
    }
    for (const tag of post.tags) {
      countsByTagId.set(tag.id, (countsByTagId.get(tag.id) ?? 0) + 1)
    }
  }

  const summaries: Array<BlogCategorySummary> = tagRows.map((row) => ({
    id: row.id,
    name: row.data.name,
    count: row.id === AllCategoryParam ? nonTwieCount : (countsByTagId.get(row.id) ?? 0),
  }))

  return summaries.sort((a, b) => {
    if (a.id === AllCategoryParam) {
      return -1
    }
    if (b.id === AllCategoryParam) {
      return 1
    }
    return b.count - a.count
  })
}

export interface BlogPostLink {
  readonly id: string
  readonly title: string
  readonly href: string
}

/**
 * `sortedNewestFirst` must already be sorted newest-first. "Previous" is the
 * OLDER post and "Next" is the NEWER post — the inverse of index order on a
 * newest-first list.
 */
export function blogPostNeighbors(sortedNewestFirst: ReadonlyArray<BlogPost>, id: string) {
  const currentIndex = sortedNewestFirst.findIndex((post) => post.id === id)
  if (currentIndex === -1) {
    return { previous: undefined, next: undefined }
  }

  const olderPost = sortedNewestFirst[currentIndex + 1]
  const newerPost = sortedNewestFirst[currentIndex - 1]

  return {
    previous: olderPost ? toBlogPostLink(olderPost) : undefined,
    next: newerPost ? toBlogPostLink(newerPost) : undefined,
  }
}

function toBlogPostLink(post: BlogPost): BlogPostLink {
  return { id: post.id, title: post.title, href: post.href }
}

export function toBlogPostSummary(post: BlogPost): BlogPostSummary {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    date: post.formattedDate,
    dateMs: DateTime.toEpochMillis(post.publishedOn),
    tags: post.tags.map((tag) => ({ id: tag.id, name: tag.name })),
  }
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
}

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character)
}

export interface BlogFeedPost {
  readonly title: string
  readonly description: string
  readonly pubDate: Date
  readonly link: string
  readonly customData: string
}

export function toBlogFeedPost(post: BlogPost): BlogFeedPost {
  const authorNames = post.authors.map((author) => escapeXml(author.name)).join(", ")
  return {
    title: post.title,
    description: post.excerpt,
    pubDate: DateTime.toDateUtc(post.publishedOn),
    link: post.href,
    customData: `<author>${authorNames}</author>`,
  }
}
