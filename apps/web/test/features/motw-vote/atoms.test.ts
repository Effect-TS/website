import { afterEach, assert, beforeEach, describe, test } from "vite-plus/test"
import * as Schema from "effect/Schema"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import {
  addedAtom,
  coveredAtom,
  messageAtom,
  moduleIndexAtom,
  pickAtom,
  rankingAtom,
  suggestingAtom,
  toggleAtom,
  votingAtom,
} from "../../../src/features/motw-vote/atoms.ts"

const index = [
  { id: "effect/Pool", pkg: "effect", name: "Pool" },
  { id: "effect/Cause", pkg: "effect", name: "Cause" },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const realFetch = globalThis.fetch
let posts: Array<{ path: string; id: string; token?: string | undefined }> = []
let removed = 0
let reply: (body: { id: string }, path: string) => Response
let networkDown = false

const setup = () => {
  const registry = AtomRegistry.make()
  registry.set(moduleIndexAtom, index)
  registry.set(coveredAtom, [])
  registry.mount(messageAtom)
  registry.mount(rankingAtom)
  registry.mount(toggleAtom)
  registry.mount(pickAtom)
  registry.mount(votingAtom)
  registry.mount(addedAtom)
  registry.mount(suggestingAtom)
  return registry
}

const loaded = async (registry: AtomRegistry.AtomRegistry) => {
  for (let i = 0; i < 50; i++) {
    const ranking = registry.get(rankingAtom)
    if (AsyncResult.isSuccess(ranking)) return ranking.value.rows
    await sleep(10)
  }
  throw new Error(
    "ranking did not load " +
      JSON.stringify(registry.get(rankingAtom), (_, v) =>
        typeof v === "bigint" ? String(v) : v,
      ),
  )
}

const decodeVote = Schema.decodeUnknownSync(
  Schema.Struct({
    id: Schema.String,
    token: Schema.optional(Schema.String),
  }),
)

beforeEach(() => {
  posts = []
  removed = 0
  networkDown = false
  reply = (body) =>
    Response.json({ id: body.id, votes: 1, voted: true }, { status: 200 })
  Object.assign(globalThis, {
    location: new URL("http://test/"),
    window: {
      turnstile: {
        render: (
          _: unknown,
          options: { callback: (token: string) => void },
        ) => {
          setTimeout(() => options.callback("token"), 5)
          return "widget"
        },
        remove: () => {},
      },
    },
    document: {
      head: {
        append: (script: { onload: () => void }) =>
          queueMicrotask(() => script.onload()),
      },
      body: { append: () => {} },
      createElement: () => ({
        setAttribute: () => {},
        remove: () => {
          removed++
        },
      }),
    },
    fetch: async (input: Request | string, init?: RequestInit) => {
      const request = new Request(
        typeof input === "string" ? new URL(input, "http://test") : input,
        init,
      )
      if (request.method === "GET")
        return Response.json({
          requests: [{ id: "effect/Pool", votes: 3 }],
          voted: [],
          turnstileSiteKey: "key",
        })
      if (networkDown) throw new TypeError("Failed to fetch")
      const body = decodeVote(await request.json())
      const path = new URL(request.url).pathname
      posts.push({ path, ...body })
      await sleep(60)
      return reply(body, path)
    },
  })
})

afterEach(() => {
  Object.assign(globalThis, { fetch: realFetch })
  Reflect.deleteProperty(globalThis, "location")
  Reflect.deleteProperty(globalThis, "window")
  Reflect.deleteProperty(globalThis, "document")
})

describe("votes", () => {
  test("a vote that starts while another runs is dropped", async () => {
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    registry.set(toggleAtom, { ...pool!, id: "effect/Other", name: "Other" })
    registry.set(pickAtom, index[1]!)
    await sleep(300)
    assert.equal(posts.length, 1)
    assert.equal(posts[0]!.id, "effect/Pool")
    assert.equal(posts[0]!.token, "token")
    assert.equal(removed, 1)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.equal(posts.length, 2)
  })

  test("a vote that is removed sends no token", async () => {
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, { ...pool!, voted: true })
    await sleep(300)
    assert.equal(posts.length, 1)
    assert.equal(posts[0]!.path, "/api/motw-vote/unvote")
    assert.isFalse("token" in posts[0]!)
  })

  test("a refusal becomes a message", async () => {
    reply = () =>
      Response.json(
        { _tag: "VoteRefusedError", reason: "RateLimited" },
        { status: 409 },
      )
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), {
      tone: "error",
      text: "Too many votes in a short time. Try again in a minute.",
    })
  })

  test("a covered module is refused without a request", async () => {
    const registry = setup()
    registry.set(coveredAtom, ["effect/Cause"])
    await loaded(registry)
    registry.set(pickAtom, index[1]!)
    await sleep(100)
    assert.equal(posts.length, 0)
    assert.equal(
      registry.get(messageAtom)?.text,
      "Cause has already been covered. Find it in the modules above.",
    )
  })
})

describe("feedback", () => {
  test("adding from a row says so", async () => {
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), {
      tone: "ok",
      text: "+1 added to Pool",
      pkg: "effect",
      suffix: ".",
    })
  })

  test("removing a vote says so, like adding does", async () => {
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, { ...pool!, voted: true })
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), {
      tone: "ok",
      text: "Removed your +1 from Pool",
      pkg: "effect",
      suffix: ".",
    })
  })

  test("a module added from the search is confirmed", async () => {
    const registry = setup()
    await loaded(registry)
    assert.isFalse(registry.get(addedAtom))
    registry.set(pickAtom, index[0]!)
    await sleep(300)
    assert.isTrue(registry.get(addedAtom))
    assert.deepEqual(registry.get(messageAtom), {
      tone: "ok",
      text: "+1 added to Pool",
      pkg: "effect",
      suffix: ".",
    })
  })
})

describe("the Suggest button", () => {
  test("is busy for a suggestion, not for a row", async () => {
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(20)
    assert.isTrue(registry.get(votingAtom))
    assert.isFalse(registry.get(suggestingAtom))
    await sleep(300)
    registry.set(pickAtom, index[1]!)
    await sleep(20)
    assert.isTrue(registry.get(suggestingAtom))
    await sleep(400)
    assert.isFalse(registry.get(suggestingAtom))
  })

  test("drops its confirmation when a row is toggled", async () => {
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(pickAtom, index[0]!)
    await sleep(300)
    assert.isTrue(registry.get(addedAtom))
    registry.set(toggleAtom, { ...pool!, voted: true })
    await sleep(300)
    assert.isFalse(registry.get(addedAtom))
  })
})

describe("when something goes wrong", () => {
  const generic = {
    tone: "error",
    text: "Couldn't save your +1. Try again.",
  }

  test("a network failure is a message, and nothing is left busy", async () => {
    networkDown = true
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), generic)
    assert.isFalse(registry.get(votingAtom))
    assert.isFalse(registry.get(addedAtom))
    const row = (await loaded(registry))[0]!
    assert.equal(row.votes, 3)
    assert.isFalse(row.voted)
  })

  test("a server error is the same message, and the next vote goes through", async () => {
    reply = () => new Response("boom", { status: 500 })
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), generic)
    reply = (body) => Response.json({ id: body.id, votes: 4, voted: true })
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.equal(posts.length, 2)
    assert.equal(registry.get(messageAtom)?.tone, "ok")
    assert.equal((await loaded(registry))[0]!.votes, 4)
  })

  test("a removal that fails keeps the vote and says so", async () => {
    reply = (_, path) =>
      path.endsWith("/unvote")
        ? new Response("boom", { status: 500 })
        : Response.json({ id: "effect/Pool", votes: 3, voted: true })
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, { ...pool!, voted: true })
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), generic)
    assert.equal(posts[0]!.path, "/api/motw-vote/unvote")
    assert.isFalse(registry.get(votingAtom))
  })

  test("a bot check that cannot run asks to turn off blockers, and sends nothing", async () => {
    const win = (globalThis as unknown as { window: { turnstile?: unknown } })
      .window
    Reflect.deleteProperty(win, "turnstile")
    Object.assign(
      (globalThis as unknown as { document: { head: object } }).document.head,
      {
        append: (script: { onerror: () => void }) =>
          queueMicrotask(() => script.onerror()),
      },
    )
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.equal(posts.length, 0)
    assert.equal(registry.get(messageAtom)?.tone, "error")
    assert.include(registry.get(messageAtom)?.text, "Turn off content blockers")
    assert.isFalse(registry.get(votingAtom))
  })

  test("a refused check says the +1 was not saved", async () => {
    reply = () =>
      Response.json(
        { _tag: "VoteRefusedError", reason: "ChallengeFailed" },
        { status: 409 },
      )
    const registry = setup()
    const [pool] = await loaded(registry)
    registry.set(toggleAtom, pool!)
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), {
      tone: "error",
      text: "We could not tell you are not a bot, so your +1 was not saved.",
    })
  })

  test("a failed add from the search shows no confirmation", async () => {
    networkDown = true
    const registry = setup()
    await loaded(registry)
    registry.set(pickAtom, index[1]!)
    await sleep(300)
    assert.deepEqual(registry.get(messageAtom), generic)
    assert.isFalse(registry.get(addedAtom))
    assert.isFalse(registry.get(votingAtom))
  })
})
