import { env } from "cloudflare:workers"
import { afterAll, assert, beforeAll, describe, test, vi } from "vite-plus/test"
import { serve } from "../../../src/features/motw-vote/server.ts"
import { issueVoter } from "../../../src/features/motw-vote/voter.ts"

const BASE = "https://effect.website/api/motw-vote"

// The test stub of `cloudflare:workers` holds a plain object
const bindings = env as Record<string, unknown>

beforeAll(() => {
  Object.assign(bindings, {
    ASSETS: {
      fetch: async () =>
        Response.json({
          modules: ["effect/Pool", "effect/Stream", "effect/RcMap"],
          covered: ["effect/RcMap"],
        }),
    },
  })
  vi.stubGlobal("fetch", async () => Response.json({ success: true }))
})

afterAll(() => {
  vi.unstubAllGlobals()
  delete bindings.ASSETS
})

const get = (cookie?: string) =>
  serve(new Request(BASE, { headers: cookie ? { cookie } : {} }))

const post = (body: unknown, cookie?: string) =>
  serve(
    new Request(`${BASE}/vote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  )

const cookieOf = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0]

describe("serve", () => {
  test("answers an anonymous ranking without a cookie", async () => {
    const response = await get()
    assert.equal(response.status, 200)
    assert.isNull(response.headers.get("set-cookie"))
    assert.equal(response.headers.get("cache-control"), "private, no-store")
  })

  test("a first vote sets the voter cookie, which then owns the vote", async () => {
    const response = await post({
      id: "effect/Pool",
      on: true,
      token: "any",
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get("cache-control"), "private, no-store")
    const cookie = cookieOf(response)
    assert.isString(cookie)
    const ranking = (await (await get(cookie)).json()) as {
      voted: Array<string>
    }
    assert.deepEqual(ranking.voted, ["effect/Pool"])
  })

  test("a removal without a cookie touches nothing and sets no cookie", async () => {
    const response = await post({ id: "effect/Pool", on: false })
    assert.equal(response.status, 200)
    assert.isNull(response.headers.get("set-cookie"))
    assert.deepEqual(await response.json(), {
      id: "effect/Pool",
      votes: 0,
      voted: false,
    })
  })

  test("a refused vote sets no cookie", async () => {
    const response = await post({ id: "effect/RcMap", on: true, token: "any" })
    assert.equal(response.status, 409)
    assert.isNull(response.headers.get("set-cookie"))
    assert.equal(response.headers.get("cache-control"), "private, no-store")
  })

  test("a GET with a forged cookie is answered and the cookie cleared", async () => {
    const { voter } = await issueVoter("another-secret")
    const response = await get(`motw_voter=${voter}.forged`)
    assert.equal(response.status, 200)
    assert.include(response.headers.get("set-cookie"), "Max-Age=0")
    assert.equal(response.headers.get("cache-control"), "private, no-store")
    assert.deepEqual(((await response.json()) as { voted: [] }).voted, [])
  })

  test("a POST with a forged cookie is refused and the cookie cleared", async () => {
    const { voter } = await issueVoter("another-secret")
    const response = await post(
      { id: "effect/Pool", on: true, token: "any" },
      `motw_voter=${voter}.forged`,
    )
    assert.equal(response.status, 403)
    assert.include(response.headers.get("set-cookie"), "Max-Age=0")
    assert.equal(response.headers.get("cache-control"), "private, no-store")
  })

  test("turns down an id or a token over the size caps", async () => {
    const id = await post({ id: "e".repeat(201), on: false })
    assert.equal(id.status, 400)
    const token = await post({
      id: "effect/Pool",
      on: true,
      token: "t".repeat(2049),
    })
    assert.equal(token.status, 400)
    assert.isNull(token.headers.get("set-cookie"))
    const fits = await post({
      id: "effect/Stream",
      on: true,
      token: "t".repeat(2048),
    })
    assert.equal(fits.status, 200)
  })
})
