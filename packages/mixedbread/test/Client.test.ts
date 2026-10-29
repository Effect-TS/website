import { assert, test } from "vite-plus/test"
import { API_MAX_RETRIES } from "../src/Config.ts"
import { makeClient } from "../src/Store.ts"

const rateLimited = (limited: number) => {
  let calls = 0
  const fetch: typeof globalThis.fetch = async () => {
    calls += 1
    return calls <= limited
      ? new Response(
          JSON.stringify({ message: "You exceeded your rate limit" }),
          {
            status: 429,
            headers: {
              "content-type": "application/json",
              "retry-after-ms": "1",
            },
          },
        )
      : new Response(JSON.stringify({ id: "file", status: "completed" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
  }
  return { fetch, calls: () => calls }
}

test("waits out a burst of 429 responses", async () => {
  const api = rateLimited(API_MAX_RETRIES)
  const file = await makeClient("key", api.fetch).stores.files.retrieve(
    "file",
    {
      store_identifier: "store",
    },
  )
  assert.equal(file.status, "completed")
  assert.equal(api.calls(), API_MAX_RETRIES + 1)
})

test("gives up when the limit does not clear", async () => {
  const api = rateLimited(API_MAX_RETRIES + 1)
  let status: number | undefined
  try {
    await makeClient("key", api.fetch).stores.files.retrieve("file", {
      store_identifier: "store",
    })
  } catch (error) {
    status = (error as { status?: number }).status
  }
  assert.equal(status, 429)
})
