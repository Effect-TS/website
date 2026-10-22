import { assert, describe, test } from "vite-plus/test"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as Schema from "effect/Schema"
import {
  ModuleCatalog,
  type ModuleStatus,
} from "../../../src/features/motw-vote/catalog.ts"
import { MotwVoteLive } from "../../../src/features/motw-vote/server.ts"
import {
  ClientRateLimit,
  Turnstile,
} from "../../../src/features/motw-vote/guards.ts"
import { VoteStore } from "../../../src/features/motw-vote/vote-store.ts"

const decodeRefusal = Schema.decodeUnknownSync(
  Schema.Struct({ reason: Schema.String }),
)

const BASE = "https://effect.website/api/motw-vote"

let statuses: Record<string, ModuleStatus> = {
  "effect/Pool": "votable",
  "effect/Stream": "votable",
  "effect/RcMap": "covered",
}

// Cloudflare counts per key. This double allows 20 calls for each.
const rateLimit = (limit: number) => {
  const counts = new Map<string, number>()
  return ClientRateLimit.layer({
    limit: async ({ key }) => {
      const count = (counts.get(key) ?? 0) + 1
      counts.set(key, count)
      return { success: count <= limit }
    },
  })
}

const dependencies = () =>
  Layer.mergeAll(
    rateLimit(20),
    VoteStore.layerMemory,
    Layer.succeed(ModuleCatalog, {
      status: (id) => Effect.succeed(statuses[id] ?? "unknown"),
    }),
    Layer.succeed(Turnstile, {
      siteKey: "site-key",
      verify: (token) => Effect.succeed(token === "solved"),
    }),
  )

// One handler per test: each has its own store and rate limits
const makeHandler = () => {
  statuses = {
    "effect/Pool": "votable",
    "effect/Stream": "votable",
    "effect/RcMap": "covered",
  }
  return HttpRouter.toWebHandler(
    MotwVoteLive.pipe(
      Layer.provide(dependencies()),
      Layer.provide(HttpServer.layerServices),
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({ MOTW_VOTE_SECRET: "test-secret" }),
        ),
      ),
    ),
    { disableLogger: true },
  )
}

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

const post = (body: unknown, headers: Record<string, string> = {}) => ({
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
        post({ id: "effect/Pool", token: "solved" }),
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
        post({ id: "effect/Pool", token: "solved" }),
      )
      const headers = { cookie: cookieOf(first) }
      const second = await fetch(
        "/vote",
        post({ id: "effect/Stream", token: "solved" }, headers),
      )
      assert.isNull(second.headers.get("set-cookie"))
      const removed = await fetch(
        "/unvote",
        post({ id: "effect/Pool" }, headers),
      )
      assert.deepStrictEqual(await removed.json(), {
        id: "effect/Pool",
        votes: 0,
        voted: false,
      })
    }))

  test("the ranking drops covered and unknown modules, and keeps the rest by votes", () =>
    withHandler(async (fetch) => {
      const first = await fetch(
        "/vote",
        post({ id: "effect/Pool", token: "solved" }),
      )
      await fetch("/vote", post({ id: "effect/Pool", token: "solved" }))
      await fetch("/vote", post({ id: "effect/Stream", token: "solved" }))
      const ranking = await fetch("", {
        headers: { cookie: cookieOf(first) },
      })
      assert.deepStrictEqual(await ranking.json(), {
        requests: [
          { id: "effect/Pool", votes: 2 },
          { id: "effect/Stream", votes: 1 },
        ],
        voted: ["effect/Pool"],
        turnstileSiteKey: "site-key",
      })

      statuses = { ...statuses, "effect/Pool": "covered" }
      const later = await fetch("", { headers: { cookie: cookieOf(first) } })
      assert.deepStrictEqual(await later.json(), {
        requests: [{ id: "effect/Stream", votes: 1 }],
        voted: [],
        turnstileSiteKey: "site-key",
      })
    }))

  test("refusals answer 409 with the reason and stay private", () =>
    withHandler(async (fetch) => {
      const refusal = async (body: unknown) => {
        const response = await fetch("/vote", post(body))
        assert.equal(response.status, 409)
        assert.equal(response.headers.get("cache-control"), "private, no-store")
        assert.isNull(response.headers.get("set-cookie"))
        return decodeRefusal(await response.json()).reason
      }
      assert.equal(
        await refusal({ id: "effect/RcMap", token: "solved" }),
        "Covered",
      )
      assert.equal(
        await refusal({ id: "effect/Nope", token: "solved" }),
        "UnknownModule",
      )
      assert.equal(
        await refusal({ id: "effect/Pool", token: "forged" }),
        "ChallengeFailed",
      )
    }))

  test("an anonymous removal sets no cookie and reports the real count", () =>
    withHandler(async (fetch) => {
      const voter = await fetch(
        "/vote",
        post({ id: "effect/Pool", token: "solved" }),
      )
      const response = await fetch("/unvote", post({ id: "effect/Pool" }))
      assert.equal(response.status, 200)
      assert.isNull(response.headers.get("set-cookie"))
      assert.deepStrictEqual(await response.json(), {
        id: "effect/Pool",
        votes: 1,
        voted: false,
      })
      const ranking = await fetch("", { headers: { cookie: cookieOf(voter) } })
      assert.deepStrictEqual((await ranking.json()).voted, ["effect/Pool"])
    }))

  test("a forged cookie is an anonymous voter: it is replaced on the next vote", () =>
    withHandler(async (fetch) => {
      const forged = {
        cookie: "motw_voter=11111111-1111-4111-8111-111111111111.forged",
      }
      const read = await fetch("", { headers: forged })
      assert.equal(read.status, 200)
      assert.isNull(read.headers.get("set-cookie"))
      const voted = await fetch(
        "/vote",
        post({ id: "effect/Pool", token: "solved" }, forged),
      )
      assert.equal(voted.status, 200)
      assert.match(
        voted.headers.get("set-cookie") ?? "",
        /^motw_voter=[0-9a-f-]{36}\./,
      )
    }))

  test("too large an id or token is a 400", () =>
    withHandler(async (fetch) => {
      const longId = await fetch(
        "/vote",
        post({ id: "x".repeat(201), token: "solved" }),
      )
      assert.equal(longId.status, 400)
      const longToken = await fetch(
        "/vote",
        post({ id: "effect/Pool", token: "x".repeat(2049) }),
      )
      assert.equal(longToken.status, 400)
    }))

  test("a vote without a token is a 400", () =>
    withHandler(async (fetch) => {
      const response = await fetch("/vote", post({ id: "effect/Pool" }))
      assert.equal(response.status, 400)
    }))

  test("a client can post 20 votes a minute", () =>
    withHandler(async (fetch) => {
      const send = (ip = "203.0.113.7") =>
        fetch(
          "/unvote",
          post({ id: "effect/Pool" }, { "cf-connecting-ip": ip }),
        )
      const statuses = await Promise.all(
        Array.from({ length: 20 }, () => send()).map((response) =>
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
      const other = await send("203.0.113.8")
      assert.equal(other.status, 200)
    }))
})
