import { assert, describe, test } from "vite-plus/test"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import { MotwVoteLive } from "../../../src/features/motw-vote/api-live.ts"
import {
  ModuleCatalog,
  type ModuleStatus,
} from "../../../src/features/motw-vote/catalog.ts"
import { Turnstile } from "../../../src/features/motw-vote/turnstile.ts"
import { memoryLayer } from "../../../src/features/motw-vote/vote-store.ts"

const BASE = "https://effect.website/api/motw-vote"

const statuses: Record<string, ModuleStatus> = {
  "effect/Pool": "votable",
  "effect/Stream": "votable",
  "effect/RcMap": "covered",
}

const dependencies = Layer.mergeAll(
  memoryLayer,
  RateLimiter.layerStoreMemory,
  Layer.succeed(ModuleCatalog, {
    status: (id) => Effect.succeed(statuses[id] ?? "unknown"),
  }),
  Layer.succeed(Turnstile, {
    siteKey: "site-key",
    verify: (token) => Effect.succeed(token === "solved"),
  }),
)

// One handler per test: each has its own store and rate limits
const makeHandler = () =>
  HttpRouter.toWebHandler(
    MotwVoteLive.pipe(
      Layer.provide(dependencies),
      Layer.provide(HttpServer.layerServices),
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({ MOTW_VOTE_SECRET: "test-secret" }),
        ),
      ),
    ),
    { disableLogger: true },
  )

const withHandler = async (
  use: (
    fetch: (path: string, init?: RequestInit) => Promise<Response>,
  ) => Promise<void>,
) => {
  const { handler, dispose } = makeHandler()
  try {
    await use((path, init) => handler(new Request(`${BASE}${path}`, init)))
  } finally {
    await dispose()
  }
}

const vote = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  body: JSON.stringify(body),
  headers: { "content-type": "application/json", ...headers },
})

const cookieOf = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0] ?? ""

describe("motw vote api", () => {
  test("an anonymous ranking is private, empty and sets no cookie", () =>
    withHandler(async (fetch) => {
      const response = await fetch("")
      assert.equal(response.status, 200)
      assert.equal(response.headers.get("cache-control"), "private, no-store")
      assert.isNull(response.headers.get("set-cookie"))
      assert.deepStrictEqual(await response.json(), {
        requests: [],
        voted: [],
        turnstileSiteKey: "site-key",
      })
    }))

  test("the first vote sets a signed cookie that the next request is known by", () =>
    withHandler(async (fetch) => {
      const response = await fetch(
        "/vote",
        vote({ id: "effect/Pool", on: true, token: "solved" }),
      )
      assert.equal(response.status, 200)
      const cookie = response.headers.get("set-cookie") ?? ""
      assert.match(cookie, /^motw_voter=[0-9a-f-]{36}\.[A-Za-z0-9_-]{43};/)
      assert.include(cookie, "HttpOnly")
      assert.include(cookie, "SameSite=Lax")
      assert.include(cookie, "Path=/api/motw-vote")
      assert.deepStrictEqual(await response.json(), {
        id: "effect/Pool",
        votes: 1,
        voted: true,
      })

      const ranking = await fetch("", {
        headers: { cookie: cookieOf(response) },
      })
      assert.deepStrictEqual(await ranking.json(), {
        requests: [{ id: "effect/Pool", votes: 1 }],
        voted: ["effect/Pool"],
        turnstileSiteKey: "site-key",
      })
    }))

  test("a known voter votes again without a new cookie, and can remove a vote", () =>
    withHandler(async (fetch) => {
      const first = await fetch(
        "/vote",
        vote({ id: "effect/Pool", on: true, token: "solved" }),
      )
      const headers = { cookie: cookieOf(first) }
      const second = await fetch(
        "/vote",
        vote({ id: "effect/Stream", on: true, token: "solved" }, headers),
      )
      assert.isNull(second.headers.get("set-cookie"))
      const removed = await fetch(
        "/vote",
        vote({ id: "effect/Pool", on: false }, headers),
      )
      assert.deepStrictEqual(await removed.json(), {
        id: "effect/Pool",
        votes: 0,
        voted: false,
      })
    }))

  test("refusals answer 409 with the reason and stay private", () =>
    withHandler(async (fetch) => {
      const refusal = async (body: unknown) => {
        const response = await fetch("/vote", vote(body))
        assert.equal(response.status, 409)
        assert.equal(response.headers.get("cache-control"), "private, no-store")
        assert.isNull(response.headers.get("set-cookie"))
        return ((await response.json()) as { reason: string }).reason
      }
      assert.equal(
        await refusal({ id: "effect/RcMap", on: true, token: "solved" }),
        "Covered",
      )
      assert.equal(
        await refusal({ id: "effect/Nope", on: true, token: "solved" }),
        "UnknownModule",
      )
      assert.equal(
        await refusal({ id: "effect/Pool", on: true }),
        "ChallengeFailed",
      )
      assert.equal(
        await refusal({ id: "effect/Pool", on: true, token: "forged" }),
        "ChallengeFailed",
      )
    }))

  test("an anonymous removal sets no cookie", () =>
    withHandler(async (fetch) => {
      const response = await fetch(
        "/vote",
        vote({ id: "effect/Pool", on: false }),
      )
      assert.equal(response.status, 200)
      assert.isNull(response.headers.get("set-cookie"))
    }))

  test("a forged cookie is cleared on a read, and blocks a vote", () =>
    withHandler(async (fetch) => {
      const forged = {
        cookie: "motw_voter=11111111-1111-4111-8111-111111111111.forged",
      }
      const read = await fetch("", { headers: forged })
      assert.equal(read.status, 200)
      assert.include(read.headers.get("set-cookie") ?? "", "Max-Age=0")
      const blocked = await fetch(
        "/vote",
        vote({ id: "effect/Pool", on: true, token: "solved" }, forged),
      )
      assert.equal(blocked.status, 409)
      assert.deepStrictEqual(await blocked.json(), {
        _tag: "VoteRefusedError",
        reason: "InvalidVoter",
      })
      assert.include(blocked.headers.get("set-cookie") ?? "", "Max-Age=0")
    }))

  test("a vote from another site is refused", () =>
    withHandler(async (fetch) => {
      const body = { id: "effect/Pool", on: true, token: "solved" }
      const foreign = await fetch(
        "/vote",
        vote(body, { origin: "https://evil.example" }),
      )
      assert.equal(foreign.status, 409)
      assert.deepStrictEqual(await foreign.json(), {
        _tag: "VoteRefusedError",
        reason: "InvalidVoter",
      })
      const own = await fetch(
        "/vote",
        vote(body, { origin: "https://effect.website" }),
      )
      assert.equal(own.status, 200)
    }))

  test("too large an id or token is a 400", () =>
    withHandler(async (fetch) => {
      const longId = await fetch(
        "/vote",
        vote({ id: "x".repeat(201), on: true, token: "solved" }),
      )
      assert.equal(longId.status, 400)
      const longToken = await fetch(
        "/vote",
        vote({ id: "effect/Pool", on: true, token: "x".repeat(2049) }),
      )
      assert.equal(longToken.status, 400)
    }))

  test("a client can post 20 votes a minute", () =>
    withHandler(async (fetch) => {
      const send = () =>
        fetch(
          "/vote",
          vote(
            { id: "effect/Pool", on: false },
            { "cf-connecting-ip": "203.0.113.7" },
          ),
        )
      const statuses = await Promise.all(
        Array.from({ length: 20 }, send).map((response) =>
          response.then((r) => r.status),
        ),
      )
      assert.isTrue(statuses.every((status) => status === 200))
      const over = await send()
      assert.equal(over.status, 409)
      assert.deepStrictEqual(await over.json(), {
        _tag: "VoteRefusedError",
        reason: "RateLimited",
      })
      const other = await fetch(
        "/vote",
        vote(
          { id: "effect/Pool", on: false },
          { "cf-connecting-ip": "203.0.113.8" },
        ),
      )
      assert.equal(other.status, 200)
    }))
})
