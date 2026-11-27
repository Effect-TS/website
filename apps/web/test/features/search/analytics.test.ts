import { assert, test, vi } from "vite-plus/test"
import { SearchAnalytics } from "../../../src/features/search/analytics.ts"

type Property = boolean | number | string

interface TrackedEvent {
  readonly event: string
  readonly properties: Readonly<Record<string, Property>>
}

const tracked = vi.hoisted((): Array<TrackedEvent> => [])

vi.mock("@maple-dev/browser", () => ({
  MapleBrowser: {
    track(event: string, properties: Readonly<Record<string, Property>> = {}) {
      tracked.push({ event, properties })
    },
  },
}))

test("tracks bounded failure details without the search query", () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  })

  SearchAnalytics.dialogOpen("keyboard", "v3", false)
  SearchAnalytics.requestFail("private query contents", 125.4, "http", 500)
  SearchAnalytics.dialogClose()

  const failure = tracked.find(({ event }) => event === "search:request_fail")
  assert.ok(failure)
  assert.equal(failure.properties.failure_reason, "http")
  assert.equal(failure.properties.http_status, 500)
  assert.equal(failure.properties.duration_ms, 125)
  assert.equal(failure.properties.query_length_bucket, "11-25")
  assert.equal(typeof failure.properties.search_session_id, "string")
  assert.equal(Reflect.has(failure.properties, "query"), false)
})
