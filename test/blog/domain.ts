import { describe, expect, it } from "@effect/vitest"
import * as DateTime from "effect/DateTime"
import * as Result from "effect/Result"
import {
  AllCategoryParam,
  assembleBlogPosts,
  BlogAuthor,
  BlogAuthorId,
  BlogCategory,
  blogCategoryFromParam,
  blogCategoryLabel,
  blogCategoryToParam,
  type BlogCategorySummary,
  BlogPost,
  BlogPostId,
  blogPostAbsoluteUrl,
  blogPostHref,
  blogPostNeighbors,
  type BlogPostSource,
  blogShareLinks,
  BlogTag,
  BlogTagId,
  type BlogTagSource,
  buildBlogCategorySummaries,
  escapeXml,
  formatBlogDate,
  selectFeaturedPost,
  selectGridPosts,
  selectPostsForCategory,
  sortBlogPostsByDate,
  sortBlogSummariesByDate,
  sortBlogTagsByName,
  toBlogFeedPost,
  toBlogPostSummary,
  TwieTagId,
} from "@/features/blog/domain"

const releasesTag = new BlogTag({ id: BlogTagId.make("releases"), name: "Releases" })
const effectTag = new BlogTag({ id: BlogTagId.make("effect"), name: "Effect" })
const twieTag = new BlogTag({ id: TwieTagId, name: "This Week In Effect" })

const author = new BlogAuthor({
  id: BlogAuthorId.make("maxwell_brown"),
  name: "Maxwell Brown",
  title: "Founding Engineer",
  url: "https://effect.website/authors/maxwell_brown",
})

function makePost(options: {
  readonly id: string
  readonly date: string
  readonly tags?: ReadonlyArray<BlogTag>
  readonly authors?: ReadonlyArray<BlogAuthor>
  readonly featured?: boolean
}): BlogPost {
  return new BlogPost({
    id: BlogPostId.make(options.id),
    title: `Title for ${options.id}`,
    excerpt: `Excerpt for ${options.id}`,
    publishedOn: DateTime.makeUnsafe(options.date),
    tags: options.tags ?? [releasesTag],
    authors: options.authors ?? [author],
    featured: options.featured ?? false,
  })
}

describe("formatBlogDate", () => {
  it("formats a UTC-midnight date using the UTC calendar day regardless of the process TZ", () => {
    // vitest.config.ts pins TZ=America/New_York; the pre-fix formatter
    // rendered this same instant as "Feb 1, 2024".
    expect(formatBlogDate(DateTime.makeUnsafe("2024-02-02T00:00:00Z"))).toBe("Feb 2, 2024")
  })
})

describe("blogPostHref", () => {
  it("never has a trailing slash", () => {
    expect(blogPostHref("releases/effect/4.0-beta")).toBe("/blog/releases/effect/4.0-beta")
  })
})

describe("blogPostAbsoluteUrl", () => {
  it("builds an absolute url respecting site with no trailing slash", () => {
    const site = new URL("https://effect.website")
    expect(blogPostAbsoluteUrl("releases/effect/4.0-beta", site)).toBe(
      "https://effect.website/blog/releases/effect/4.0-beta",
    )
  })
})

describe("blogShareLinks", () => {
  it("builds x/linkedin share urls around the post's absolute url", () => {
    const post = makePost({ id: "releases/effect/4.0-beta", date: "2024-02-01T00:00:00Z" })
    const links = blogShareLinks(post, new URL("https://effect.website"))

    expect(links.postUrl).toBe("https://effect.website/blog/releases/effect/4.0-beta")
    expect(links.xUrl).toBe(
      "https://twitter.com/intent/tweet?text=Title%20for%20releases%2Feffect%2F4.0-beta&url=https%3A%2F%2Feffect.website%2Fblog%2Freleases%2Feffect%2F4.0-beta",
    )
    expect(links.linkedInUrl).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Feffect.website%2Fblog%2Freleases%2Feffect%2F4.0-beta",
    )
  })
})

describe("blogCategoryFromParam", () => {
  const validTagIds = ["releases", "effect"]

  it("maps null to AllPosts", () => {
    expect(blogCategoryFromParam(null, validTagIds)).toEqual(BlogCategory.AllPosts())
  })

  it("maps 'all' to AllPosts", () => {
    expect(blogCategoryFromParam(AllCategoryParam, validTagIds)).toEqual(BlogCategory.AllPosts())
  })

  it("maps an unknown id to AllPosts", () => {
    expect(blogCategoryFromParam("nonexistent", validTagIds)).toEqual(BlogCategory.AllPosts())
  })

  it("maps the twie tag id to ThisWeekInEffect", () => {
    expect(blogCategoryFromParam(TwieTagId, validTagIds)).toEqual(BlogCategory.ThisWeekInEffect())
  })

  it("maps a known tag id to Tag", () => {
    expect(blogCategoryFromParam("releases", validTagIds)).toEqual(
      BlogCategory.Tag({ id: BlogTagId.make("releases") }),
    )
  })
})

describe("blogCategoryToParam", () => {
  it("maps AllPosts to undefined", () => {
    expect(blogCategoryToParam(BlogCategory.AllPosts())).toBeUndefined()
  })

  it("round trips with blogCategoryFromParam", () => {
    const validTagIds = ["releases"]
    for (const param of [null, AllCategoryParam, TwieTagId, "releases"]) {
      const category = blogCategoryFromParam(param, validTagIds)
      const roundTripped = blogCategoryToParam(category) ?? AllCategoryParam
      expect(blogCategoryFromParam(roundTripped, validTagIds)).toEqual(category)
    }
  })
})

describe("selectPostsForCategory", () => {
  const posts = [
    makePost({ id: "a", date: "2024-01-01T00:00:00Z", tags: [releasesTag] }),
    makePost({ id: "b", date: "2024-01-02T00:00:00Z", tags: [twieTag] }),
    makePost({ id: "c", date: "2024-01-03T00:00:00Z", tags: [releasesTag, effectTag] }),
  ]

  it("AllPosts excludes TWIE", () => {
    expect(selectPostsForCategory(posts, BlogCategory.AllPosts()).map((post) => post.id)).toEqual([
      "a",
      "c",
    ])
  })

  it("ThisWeekInEffect returns only TWIE posts", () => {
    expect(
      selectPostsForCategory(posts, BlogCategory.ThisWeekInEffect()).map((post) => post.id),
    ).toEqual(["b"])
  })

  it("Tag matches exact tag; a multi-tag post appears under each of its tags", () => {
    expect(
      selectPostsForCategory(posts, BlogCategory.Tag({ id: BlogTagId.make("releases") })).map(
        (post) => post.id,
      ),
    ).toEqual(["a", "c"])
    expect(
      selectPostsForCategory(posts, BlogCategory.Tag({ id: BlogTagId.make("effect") })).map(
        (post) => post.id,
      ),
    ).toEqual(["c"])
  })
})

describe("sortBlogPostsByDate", () => {
  it("sorts newest first and is stable for equal timestamps", () => {
    const posts = [
      makePost({ id: "old", date: "2024-01-01T00:00:00Z" }),
      makePost({ id: "new", date: "2024-03-01T00:00:00Z" }),
      makePost({ id: "mid-a", date: "2024-02-01T00:00:00Z" }),
      makePost({ id: "mid-b", date: "2024-02-01T00:00:00Z" }),
    ]
    expect(sortBlogPostsByDate(posts).map((post) => post.id)).toEqual([
      "new",
      "mid-a",
      "mid-b",
      "old",
    ])
  })
})

describe("sortBlogSummariesByDate", () => {
  const summaries = [
    { id: "a", title: "", excerpt: "", date: "", dateMs: 100, tags: [] },
    { id: "b", title: "", excerpt: "", date: "", dateMs: 300, tags: [] },
    { id: "c", title: "", excerpt: "", date: "", dateMs: 200, tags: [] },
  ]

  it("newest first", () => {
    expect(sortBlogSummariesByDate(summaries, "newest").map((s) => s.id)).toEqual(["b", "c", "a"])
  })

  it("oldest first", () => {
    expect(sortBlogSummariesByDate(summaries, "oldest").map((s) => s.id)).toEqual(["a", "c", "b"])
  })
})

describe("sortBlogTagsByName", () => {
  it("sorts alphabetically by display name", () => {
    const causeAndEffectTag = new BlogTag({
      id: BlogTagId.make("cause-and-effect"),
      name: "Cause & Effect",
    })
    expect(
      sortBlogTagsByName([effectTag, releasesTag, causeAndEffectTag]).map((tag) => tag.name),
    ).toEqual(["Cause & Effect", "Effect", "Releases"])
  })
})

describe("selectFeaturedPost", () => {
  it("returns undefined and no duplicates when no post is featured", () => {
    const result = selectFeaturedPost([makePost({ id: "a", date: "2024-01-01T00:00:00Z" })])
    expect(result.post).toBeUndefined()
    expect(result.duplicates).toEqual([])
  })

  it("ignores a TWIE-tagged post even if marked featured", () => {
    const result = selectFeaturedPost([
      makePost({ id: "twie", date: "2024-01-01T00:00:00Z", tags: [twieTag], featured: true }),
    ])
    expect(result.post).toBeUndefined()
  })

  it("picks the newest of multiple featured posts and reports the duplicates", () => {
    const result = selectFeaturedPost([
      makePost({ id: "old", date: "2024-01-01T00:00:00Z", featured: true }),
      makePost({ id: "new", date: "2024-02-01T00:00:00Z", featured: true }),
    ])
    expect(result.post?.id).toBe("new")
    expect(result.duplicates.map((post) => post.id)).toEqual(["new", "old"])
  })
})

describe("selectGridPosts", () => {
  it("excludes the featured post from the grid", () => {
    const featured = makePost({ id: "featured", date: "2024-01-01T00:00:00Z", featured: true })
    const other = makePost({ id: "other", date: "2024-01-02T00:00:00Z" })
    expect(selectGridPosts([featured, other], featured).map((post) => post.id)).toEqual(["other"])
  })

  it("returns every post when there is no featured post", () => {
    const other = makePost({ id: "other", date: "2024-01-02T00:00:00Z" })
    expect(selectGridPosts([other], undefined)).toEqual([other])
  })
})

describe("buildBlogCategorySummaries", () => {
  const tagRows: ReadonlyArray<BlogTagSource> = [
    { id: "all", data: { name: "All" } },
    { id: "releases", data: { name: "Releases" } },
    { id: "effect", data: { name: "Effect" } },
    { id: TwieTagId, data: { name: "This Week In Effect" } },
  ]
  const gridPosts = [
    makePost({ id: "a", date: "2024-01-01T00:00:00Z", tags: [releasesTag] }),
    makePost({ id: "b", date: "2024-01-02T00:00:00Z", tags: [twieTag] }),
    makePost({ id: "c", date: "2024-01-03T00:00:00Z", tags: [releasesTag, effectTag] }),
  ]

  it("sorts 'all' first, then by count descending", () => {
    const summaries = buildBlogCategorySummaries(gridPosts, tagRows)
    expect(summaries[0]?.id).toBe("all")
    for (let index = 1; index < summaries.length; index++) {
      expect(summaries[index - 1]?.count ?? 0).toBeGreaterThanOrEqual(summaries[index]?.count ?? 0)
    }
  })

  it("every count matches selectPostsForCategory for the same category", () => {
    const summaries = buildBlogCategorySummaries(gridPosts, tagRows)
    for (const summary of summaries) {
      const category = blogCategoryFromParam(summary.id, ["releases", "effect"])
      expect(summary.count).toBe(selectPostsForCategory(gridPosts, category).length)
    }
  })
})

describe("blogPostNeighbors", () => {
  const posts = [
    makePost({ id: "newest", date: "2024-03-01T00:00:00Z" }),
    makePost({ id: "middle", date: "2024-02-01T00:00:00Z" }),
    makePost({ id: "oldest", date: "2024-01-01T00:00:00Z" }),
  ]

  it("for the middle post, previous is the older post and next is the newer post", () => {
    const result = blogPostNeighbors(posts, "middle")
    expect(result.previous?.id).toBe("oldest")
    expect(result.next?.id).toBe("newest")
  })

  it("the newest (first) post has no next", () => {
    const result = blogPostNeighbors(posts, "newest")
    expect(result.next).toBeUndefined()
    expect(result.previous?.id).toBe("middle")
  })

  it("the oldest (last) post has no previous", () => {
    const result = blogPostNeighbors(posts, "oldest")
    expect(result.previous).toBeUndefined()
    expect(result.next?.id).toBe("middle")
  })

  it("an unknown id yields no neighbors", () => {
    const result = blogPostNeighbors(posts, "missing")
    expect(result.previous).toBeUndefined()
    expect(result.next).toBeUndefined()
  })
})

describe("toBlogPostSummary", () => {
  it("serializes a post to its summary DTO", () => {
    const post = makePost({
      id: "releases/effect/4.0-beta",
      date: "2024-02-02T00:00:00Z",
      tags: [releasesTag, effectTag],
    })
    expect(toBlogPostSummary(post)).toEqual({
      id: "releases/effect/4.0-beta",
      title: post.title,
      excerpt: post.excerpt,
      date: "Feb 2, 2024",
      dateMs: DateTime.toEpochMillis(post.publishedOn),
      tags: [
        { id: "releases", name: "Releases" },
        { id: "effect", name: "Effect" },
      ],
    })
  })
})

describe("escapeXml", () => {
  it("escapes all five xml special characters", () => {
    expect(escapeXml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &apos;")
  })
})

describe("toBlogFeedPost", () => {
  it("has no trailing slash and escapes author names into customData", () => {
    const post = makePost({
      id: "releases/effect/4.0-beta",
      date: "2024-02-02T00:00:00Z",
      authors: [
        new BlogAuthor({
          id: BlogAuthorId.make("tim_and_bob"),
          name: "Tim & Bob",
          title: "Founding Engineers",
          url: "https://effect.website",
        }),
      ],
    })
    const item = toBlogFeedPost(post)
    expect(item.link).toBe("/blog/releases/effect/4.0-beta")
    expect(item.customData).toBe("<author>Tim &amp; Bob</author>")
  })
})

describe("assembleBlogPosts", () => {
  const tagSources: ReadonlyArray<BlogTagSource> = [{ id: "releases", data: { name: "Releases" } }]
  const authorSources = [
    {
      id: "maxwell_brown",
      data: { name: "Maxwell Brown", title: "Founding Engineer", url: "https://effect.website" },
    },
  ]

  function makeSource(id: string, date: string): BlogPostSource {
    return {
      id,
      data: {
        title: `Title ${id}`,
        excerpt: `Excerpt ${id}`,
        date: new Date(date),
        tags: [{ id: "releases" }],
        authors: [{ id: "maxwell_brown" }],
        featured: false,
      },
    }
  }

  it("resolves tag/author references and sorts newest-first", () => {
    const result = assembleBlogPosts(
      [makeSource("old", "2024-01-01T00:00:00Z"), makeSource("new", "2024-02-01T00:00:00Z")],
      tagSources,
      authorSources,
    )
    expect(Result.isSuccess(result)).toBe(true)
    if (Result.isSuccess(result)) {
      expect(result.success.map((post) => post.id)).toEqual(["new", "old"])
      expect(result.success[0]?.tags[0]?.name).toBe("Releases")
      expect(result.success[0]?.authors[0]?.name).toBe("Maxwell Brown")
    }
  })

  it("fails with a BlogReferenceError for an unknown tag reference", () => {
    const source = makeSource("post", "2024-01-01T00:00:00Z")
    const withUnknownTag: BlogPostSource = {
      ...source,
      data: { ...source.data, tags: [{ id: "unknown-tag" }] },
    }
    const result = assembleBlogPosts([withUnknownTag], tagSources, authorSources)
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure._tag).toBe("BlogReferenceError")
      expect(result.failure.kind).toBe("tag")
      expect(result.failure.reference).toBe("unknown-tag")
    }
  })

  it("fails with a BlogReferenceError for an unknown author reference", () => {
    const source = makeSource("post", "2024-01-01T00:00:00Z")
    const withUnknownAuthor: BlogPostSource = {
      ...source,
      data: { ...source.data, authors: [{ id: "unknown-author" }] },
    }
    const result = assembleBlogPosts([withUnknownAuthor], tagSources, authorSources)
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure.kind).toBe("author")
    }
  })
})

describe("blogCategoryLabel", () => {
  const categories: ReadonlyArray<BlogCategorySummary> = [
    { id: "all", name: "All", count: 10 },
    { id: "releases", name: "Releases", count: 3 },
  ]

  it("resolves the label for AllPosts", () => {
    expect(blogCategoryLabel(BlogCategory.AllPosts(), categories)).toBe("All")
  })

  it("resolves the label for a known tag", () => {
    expect(
      blogCategoryLabel(BlogCategory.Tag({ id: BlogTagId.make("releases") }), categories),
    ).toBe("Releases")
  })

  it("falls back to 'Category' for an unknown category", () => {
    expect(blogCategoryLabel(BlogCategory.Tag({ id: BlogTagId.make("missing") }), categories)).toBe(
      "Category",
    )
  })
})
