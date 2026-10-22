import { afterEach, assert, beforeEach, describe, test } from "vite-plus/test"
import * as Schema from "effect/Schema"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import {
  coveredAtom,
  messageAtom,
  moduleIndexAtom,
  pickAtom,
  rankingAtom,
  toggleAtom,
} from "../../../src/features/motw-vote/atoms.ts"

const index = [
  { id: "effect/Pool", pkg: "effect", name: "Pool" },
  { id: "effect/Cause", pkg: "effect", name: "Cause" },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const realFetch = globalThis.fetch
let posts: Array<{ path: string; id: string; token?: string | undefined }> = []
let removed = 0
let reply: (body: { id: string }) => Response

const setup = () => {
  const registry = AtomRegistry.make()
  registry.set(moduleIndexAtom, index)
  registry.set(coveredAtom, [])
  registry.mount(messageAtom)
  registry.mount(rankingAtom)
  registry.mount(toggleAtom)
  registry.mount(pickAtom)
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
      const body = decodeVote(await request.json())
      posts.push({ path: new URL(request.url).pathname, ...body })
      await sleep(60)
      return reply(body)
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
