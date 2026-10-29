import { assert, describe, test } from "vite-plus/test"
import { searchFilter } from "../../../src/features/search/filters.ts"

const eq = (key: string, value: string) => ({
  key,
  operator: "eq" as const,
  value,
})

const blog = (version: "v3" | "v4") => ({
  all: [
    eq("content_source", "blog"),
    {
      none: [eq("docs_version", version === "v4" ? "v3" : "v4")],
    },
  ],
})

const docs = (version: string) => ({
  all: [eq("content_source", "documentation"), eq("docs_version", version)],
})

describe("searchFilter", () => {
  test("leaves a search for every group and version unfiltered", () => {
    assert.strictEqual(searchFilter({}), undefined)
    assert.strictEqual(searchFilter({ groups: [] }), undefined)
  })

  test("limits every group to the selected version", () => {
    assert.deepStrictEqual(searchFilter({ version: "v4" }), {
      any: [
        docs("v4"),
        eq("api_version", "v4"),
        blog("v4"),
        eq("content_source", "changelog"),
      ],
    })
  })

  test("leaves out the changelog for a version without one", () => {
    assert.deepStrictEqual(searchFilter({ version: "v3" }), {
      any: [docs("v3"), eq("api_version", "v3"), blog("v3")],
    })
  })

  test("searches only the chosen groups", () => {
    assert.deepStrictEqual(
      searchFilter({ version: "v4", groups: ["changelog"] }),
      eq("content_source", "changelog"),
    )
    assert.deepStrictEqual(
      searchFilter({ version: "v4", groups: ["blog", "documentation"] }),
      {
        any: [docs("v4"), blog("v4")],
      },
    )
  })

  test("keeps blog posts without a version in every version", () => {
    assert.deepStrictEqual(
      searchFilter({ version: "v4", groups: ["blog"] }),
      blog("v4"),
    )
  })

  test("tells docs and blog apart without a version", () => {
    assert.deepStrictEqual(
      searchFilter({ groups: ["documentation"] }),
      eq("content_source", "documentation"),
    )
  })

  test("scopes to one changelog package", () => {
    assert.deepStrictEqual(
      searchFilter({ version: "v4", packageSlug: "sql-pg" }),
      {
        all: [eq("content_source", "changelog"), eq("package_slug", "sql-pg")],
      },
    )
  })

  test("returns null when no chosen group has content for the version", () => {
    assert.strictEqual(
      searchFilter({ version: "v3", groups: ["changelog"] }),
      null,
    )
    assert.strictEqual(
      searchFilter({ version: "v3", packageSlug: "sql-pg" }),
      null,
    )
  })
})
