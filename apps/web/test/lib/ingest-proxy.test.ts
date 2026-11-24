import { assert, test } from "vite-plus/test"
import { toMapleRequest } from "../../src/lib/ingest-proxy.ts"

const browserRequest = (headers: Record<string, string>) =>
  new Request("https://effect.website/_ingest/v1/traces?x=1", {
    method: "POST",
    headers: {
      authorization: "Bearer maple_pk_test",
      "content-type": "application/json",
      ...headers,
    },
    body: "{}",
  })

test("forwards ingest requests to Maple with the visitor's address", () => {
  const upstream = toMapleRequest(
    browserRequest({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1",
      cookie: "motw_voter=abc",
    }),
    "v1/traces",
  )

  assert.ok(upstream)
  assert.strictEqual(upstream.url, "https://ingest.maple.dev/v1/traces?x=1")
  assert.strictEqual(upstream.method, "POST")
  assert.strictEqual(upstream.headers.get("x-forwarded-for"), "203.0.113.7")
  assert.strictEqual(
    upstream.headers.get("authorization"),
    "Bearer maple_pk_test",
  )
  assert.isNull(upstream.headers.get("cookie"))
})

test("drops a forwarded address Cloudflare did not set", () => {
  const upstream = toMapleRequest(
    browserRequest({ "x-forwarded-for": "198.51.100.1" }),
    "v1/sessionEvents",
  )
  assert.isNull(upstream?.headers.get("x-forwarded-for") ?? null)
})

test("only proxies Maple's ingest paths", () => {
  assert.isUndefined(toMapleRequest(browserRequest({}), "api/keys"))
  assert.isUndefined(toMapleRequest(browserRequest({}), ""))
})
