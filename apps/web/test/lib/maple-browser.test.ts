import { assert, test } from "vite-plus/test"
import { environmentFor } from "../../src/lib/maple-browser.ts"
import { redactUrl } from "../../src/lib/redacted-url-params.ts"

test("redacts the search query from absolute and relative URLs", () => {
  assert.strictEqual(
    redactUrl("https://effect.website/api/search?query=my%20secret&v=4#top"),
    "https://effect.website/api/search?query=REDACTED&v=4#top",
  )
  assert.strictEqual(
    redactUrl("/api/search?v=4&query=secret"),
    "/api/search?v=4&query=REDACTED",
  )
})

test("leaves other parameters alone", () => {
  const url = "https://effect.website/blog?category=releases&subquery=x"
  assert.strictEqual(redactUrl(url), url)
})

test("reports production, preview, or nothing for local development", () => {
  assert.strictEqual(environmentFor("effect.website"), "production")
  assert.strictEqual(environmentFor("pr-1701.effect.workers.dev"), "preview")
  assert.strictEqual(environmentFor("localhost"), undefined)
})
