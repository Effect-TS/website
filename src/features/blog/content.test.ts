import { describe, expect, it } from "@effect/vitest"
import tags from "@/content/blog/tags.json"
import { AllCategoryParam, SuggestedCategoryIds, TwieTagId } from "./domain"

describe("blog content guards", () => {
  const tagIds = Object.keys(tags)

  it("includes every suggested category id in tags.json", () => {
    for (const id of SuggestedCategoryIds) {
      expect(tagIds).toContain(id)
    }
  })

  it("includes the TWIE tag id in tags.json", () => {
    expect(tagIds).toContain(TwieTagId)
  })

  it("includes the synthetic 'all' category row in tags.json", () => {
    expect(tagIds).toContain(AllCategoryParam)
  })
})
