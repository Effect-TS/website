import { assert, describe, test } from "vite-plus/test"
import { searchFilter } from "../../../src/features/search/filters.ts"

const eq = (key: string, value: string) => ({
  key,
  operator: "eq" as const,
  value,
})

const blog = (version: "v3" | "v4") => ({
  all: [
    eq("generated_metadata.search.content_source", "blog"),
    {
      none: [
        eq("generated_metadata.search.version", version === "v4" ? "v3" : "v4"),
      ],
    },
  ],
})

describe("searchFilter", () => {
  test("leaves a search for every group and version unfiltered", () => {
    assert.strictEqual(searchFilter({}), undefined)
    assert.strictEqual(searchFilter({ groups: [] }), undefined)
  })

  test("limits every group to the selected version", () => {
    assert.deepStrictEqual(searchFilter({ version: "v4" }), {
      any: [
        eq("generated_metadata.search.docs_version", "v4"),
        eq("api_version", "v4"),
        blog("v4"),
        eq("content_source", "changelog"),
      ],
    })
  })

  test("leaves out the changelog for a version without one", () => {
    assert.deepStrictEqual(searchFilter({ version: "v3" }), {
      any: [
        eq("generated_metadata.search.docs_version", "v3"),
        eq("api_version", "v3"),
        blog("v3"),
      ],
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
        any: [eq("generated_metadata.search.docs_version", "v4"), blog("v4")],
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
      eq("generated_metadata.search.content_source", "documentation"),
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
