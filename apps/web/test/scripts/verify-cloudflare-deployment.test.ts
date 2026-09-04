import { assert, test } from "vite-plus/test"
import {
  retry,
  withCacheBuster,
} from "../../scripts/verify-cloudflare-deployment.mjs"

test("retries with an incrementing attempt number", async () => {
  const attempts: Array<number> = []
  const result = await retry(
    "deployment",
    async (attempt) => {
      attempts.push(attempt)
      if (attempt < 2) throw new Error("not ready")
      return "ready"
    },
    { timeoutMs: 1_000, delayMs: 0 },
  )

  assert.equal(result, "ready")
  assert.deepEqual(attempts, [0, 1, 2])
})

test("uses a distinct cache key for each deployment check", () => {
  const url = new URL("https://preview.example/not-found?existing=value")
  const first = withCacheBuster(url, "run", 0)
  const second = withCacheBuster(url, "run", 1)

  assert.equal(first.searchParams.get("existing"), "value")
  assert.equal(first.searchParams.get("deployment-check"), "run-0")
  assert.equal(second.searchParams.get("deployment-check"), "run-1")
  assert.equal(url.searchParams.has("deployment-check"), false)
})
