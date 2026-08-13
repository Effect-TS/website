import { assert, test } from "vite-plus/test"
import {
  addRecentSearch,
  normalizeRecentSearch,
} from "../../../src/services/search/preferences.ts"
import { docsVersionFromPathname } from "../../../src/lib/versions.ts"

test("selects the search version from the current docs path", () => {
  assert.equal(docsVersionFromPathname("/docs/v4/getting-started"), "v4")
  assert.equal(docsVersionFromPathname("/docs/v3/getting-started"), "v3")
})

test("uses the default version on pages without a docs or api version", () => {
  for (const pathname of ["/", "/play", "/blog", "/merch"]) {
    assert.equal(docsVersionFromPathname(pathname), "v4")
  }
})

test("recent searches retain the version they were run under", () => {
  const searches = addRecentSearch([], {
    query: "  Scope  ",
    version: "v4",
  })

  assert.deepEqual(searches, [{ query: "Scope", version: "v4" }])
})

test("repeating a recent search updates its stored version", () => {
  const searches = addRecentSearch([{ query: "Scope", version: "v4" }], {
    query: "scope",
    version: "v3",
  })

  assert.deepEqual(searches, [{ query: "scope", version: "v3" }])
})

test("legacy query-only history remains available as v3 history", () => {
  assert.deepEqual(normalizeRecentSearch("Getting Started"), {
    query: "Getting Started",
    version: "v3",
  })
})
