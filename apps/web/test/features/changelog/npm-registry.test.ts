import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { NpmRegistry } from "../../../src/features/changelog/npm-registry.ts"

const client = (respond: (url: URL) => Response, calls: Array<string> = []) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) => {
      calls.push(url.pathname)
      return Effect.succeed(HttpClientResponse.fromWeb(request, respond(url)))
    }),
  )

const run = <A, E>(
  effect: Effect.Effect<A, E, NpmRegistry>,
  http: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        NpmRegistry.layerWithRetryDelay(Schedule.recurs(5)).pipe(
          Layer.provide(http),
        ),
      ),
    ),
  )

const published = Effect.gen(function* () {
  const registry = yield* NpmRegistry
  return yield* registry.published("effect")
})

const respondOk = (url: URL) =>
  url.pathname.endsWith("/dist-tags")
    ? Response.json({ latest: "4.0.7", staging: "4.0.8" })
    : Response.json({
        time: {
          created: "2022-11-23T14:29:04.772Z",
          modified: "2026-10-28T03:40:39.388Z",
          "4.0.7": "2026-10-28T03:36:20.753Z",
        },
      })

test("reads latest from the dist-tags and dates from the packument", async () => {
  const calls: Array<string> = []
  const result = await run(published, client(respondOk, calls))
  assert.strictEqual(result.latest, "4.0.7")
  assert.deepEqual([...result.dates], [["4.0.7", "2026-10-28"]])
  assert.sameMembers(calls, ["/-/package/effect/dist-tags", "/effect"])
})

test("scoped names keep their @", async () => {
  const calls: Array<string> = []
  await run(
    Effect.gen(function* () {
      return yield* (yield* NpmRegistry).published("@effect/platform-node")
    }),
    client(respondOk, calls),
  )
  assert.include(calls, "/-/package/@effect%2Fplatform-node/dist-tags")
})

test("a failed request is retried", async () => {
  let failures = 1
  const result = await run(
    published,
    client((url) =>
      failures-- > 0
        ? new Response("unavailable", { status: 503 })
        : respondOk(url),
    ),
  )
  assert.strictEqual(result.latest, "4.0.7")
})

test("fails with NpmRegistryError once retries are exhausted", async () => {
  const error = await run(
    published.pipe(Effect.flip),
    client(() => new Response("down", { status: 500 })),
  )
  assert.strictEqual(error._tag, "NpmRegistryError")
})

test("a malformed body fails with NpmRegistryError", async () => {
  const error = await run(
    published.pipe(Effect.flip),
    client(() => Response.json({ unexpected: true })),
  )
  assert.strictEqual(error._tag, "NpmRegistryError")
})
