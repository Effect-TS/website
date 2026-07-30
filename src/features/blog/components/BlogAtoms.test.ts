import { describe, expect, it } from "@effect/vitest"
import { BlogCategory, BlogTagId } from "../domain"
import {
  applyCategoryToUrl,
  blogPageSlice,
  blogPaginationWindow,
  blogTotalPages,
} from "./BlogAtoms"

describe("applyCategoryToUrl", () => {
  it("deletes category for AllPosts and preserves other params and the hash", () => {
    const url = new URL("https://effect.website/blog?category=releases&foo=bar#blog-grid")
    const next = applyCategoryToUrl(url, BlogCategory.AllPosts())
    expect(next.searchParams.get("category")).toBeNull()
    expect(next.searchParams.get("foo")).toBe("bar")
    expect(next.hash).toBe("#blog-grid")
  })

  it("sets category for a tag", () => {
    const url = new URL("https://effect.website/blog")
    const next = applyCategoryToUrl(url, BlogCategory.Tag({ id: BlogTagId.make("effect") }))
    expect(next.searchParams.get("category")).toBe("effect")
  })
})

describe("blogTotalPages", () => {
  it("is 1 for zero posts", () => {
    expect(blogTotalPages(0)).toBe(1)
  })

  it("handles an exact multiple", () => {
    expect(blogTotalPages(24, 12)).toBe(2)
  })

  it("handles a remainder", () => {
    expect(blogTotalPages(25, 12)).toBe(3)
  })
})

describe("blogPageSlice", () => {
  const items = Array.from({ length: 25 }, (_, index) => index)

  it("returns the first page", () => {
    expect(blogPageSlice(items, 1, 12)).toEqual(items.slice(0, 12))
  })

  it("returns a middle page", () => {
    expect(blogPageSlice(items, 2, 12)).toEqual(items.slice(12, 24))
  })

  it("returns the last (partial) page", () => {
    expect(blogPageSlice(items, 3, 12)).toEqual(items.slice(24, 25))
  })

  it("clamps a page beyond the range", () => {
    expect(blogPageSlice(items, 99, 12)).toEqual(items.slice(24, 25))
  })
})

describe("blogPaginationWindow", () => {
  it("lists every page with no ellipsis when totalPages <= 7", () => {
    expect(blogPaginationWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("page 1 of 20", () => {
    expect(blogPaginationWindow(1, 20)).toEqual([1, 2, "ellipsis", 20])
  })

  it("page 10 of 20 has two ellipses", () => {
    expect(blogPaginationWindow(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20])
  })

  it("the last page of 20", () => {
    expect(blogPaginationWindow(20, 20)).toEqual([1, "ellipsis", 19, 20])
  })
})
