import { assert, test } from "vite-plus/test"
import {
  addRecentSearch,
  normalizeRecentSearch,
  searchVersionFromPathname,
} from "../../../src/services/search/preferences.ts"

test("selects the search version from the current docs path", () => {
  assert.equal(searchVersionFromPathname("/docs/v4/getting-started"), "v4")
  assert.equal(searchVersionFromPathname("/docs/v3/getting-started"), "v3")
  assert.equal(searchVersionFromPathname("/docs/v40/getting-started"), "v3")
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
