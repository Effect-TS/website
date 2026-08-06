import assert from "node:assert/strict"
import test from "node:test"
import { SearchAnalytics } from "./analytics.ts"

type Property = boolean | number | string

interface CapturedEvent {
  readonly event: string
  readonly properties: Readonly<Record<string, Property>>
}

test("captures bounded failure details without the search query", () => {
  const events: Array<CapturedEvent> = []
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      posthog: {
        capture(event: string, properties: Readonly<Record<string, Property>> = {}) {
          events.push({ event, properties })
        },
      },
    },
  })

  SearchAnalytics.dialogOpen("keyboard", "v3", false)
  SearchAnalytics.requestFail("private query contents", 125.4, "http", 500)
  SearchAnalytics.dialogClose()

  const failure = events.find(({ event }) => event === "search:request_fail")
  assert.ok(failure)
  assert.equal(failure.properties.failure_reason, "http")
  assert.equal(failure.properties.http_status, 500)
  assert.equal(failure.properties.duration_ms, 125)
  assert.equal(failure.properties.query_length_bucket, "11-25")
  assert.equal(Reflect.has(failure.properties, "query"), false)
})
