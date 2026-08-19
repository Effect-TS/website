import { assert, test } from "vite-plus/test"
import { legacyApiRedirect } from "../../../src/features/api-reference/legacy-redirect.ts"

test("redirects supported legacy API paths", () => {
  assert.equal(legacyApiRedirect("/docs/api/v3"), "/docs/v3/api")
  assert.equal(
    legacyApiRedirect("/docs/api/v4/effect/Effect"),
    "/docs/v4/api/effect/Effect",
  )
})

test("does not redirect unknown versions or unrelated paths", () => {
  assert.equal(legacyApiRedirect("/docs/api/api/effect/Effect"), undefined)
  assert.equal(legacyApiRedirect("/docs/v4/api/effect/Effect"), undefined)
})
