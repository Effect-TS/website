import { assert, test } from "vite-plus/test"
import { cacheControl } from "../../../src/features/open-graph/cache-control.ts"

test("caches versioned images immutably", () => {
  assert.equal(
    cacheControl(new URL("https://effect.website/og/index.png?v=revision")),
    "public, max-age=31536000, immutable",
  )
})

test("revalidates unversioned images", () => {
  assert.equal(
    cacheControl(new URL("https://effect.website/og/index.png")),
    "public, max-age=0, must-revalidate",
  )
})
