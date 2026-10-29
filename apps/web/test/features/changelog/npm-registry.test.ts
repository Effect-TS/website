import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { TestClock } from "effect/testing"
import { NpmRegistry } from "../../../src/features/changelog/npm-registry.ts"

const client = (
  respond: (url: URL, attempt: number) => Response,
  calls: Array<string> = [],
) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) => {
      calls.push(url.pathname)
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, respond(url, calls.length)),
      )
    }),
  )

const published = (name = "effect") =>
  Effect.gen(function* () {
    return yield* (yield* NpmRegistry).published(name)
  })

/** Runs on the test clock, so retry delays cost no time. */
const run = <A, E>(
  effect: Effect.Effect<A, E, NpmRegistry>,
  http: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(effect)
      yield* TestClock.adjust("1 minute")
      return yield* Fiber.join(fiber)
    }).pipe(
      Effect.provide(NpmRegistry.layerNoDeps.pipe(Layer.provide(http))),
      Effect.provide(TestClock.layer()),
    ),
  )

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
  const result = await run(published(), client(respondOk, calls))
  assert.strictEqual(result.latest, "4.0.7")
  assert.deepEqual([...result.dates], [["4.0.7", "2026-10-28"]])
  assert.sameMembers(calls, ["/-/package/effect/dist-tags", "/effect"])
})

test("scoped names keep their @", async () => {
  const calls: Array<string> = []
  await run(published("@effect/platform-node"), client(respondOk, calls))
  assert.include(calls, "/-/package/@effect%2Fplatform-node/dist-tags")
})

test("a transient status is retried", async () => {
  const calls: Array<string> = []
  let failures = 1
  const result = await run(
    published(),
    client(
      (url) =>
        url.pathname.endsWith("/dist-tags") && failures-- > 0
          ? new Response("unavailable", { status: 503 })
          : respondOk(url),
      calls,
    ),
  )
  assert.strictEqual(result.latest, "4.0.7")
  assert.strictEqual(distTagCalls(calls), 2)
})

const distTagCalls = (calls: ReadonlyArray<string>) =>
  calls.filter((path) => path.endsWith("/dist-tags")).length

const failDistTags = (status: number) => (url: URL) =>
  url.pathname.endsWith("/dist-tags")
    ? new Response("failed", { status })
    : respondOk(url)

test("fails with NpmRegistryError once retries are exhausted", async () => {
  const calls: Array<string> = []
  const error = await run(
    published().pipe(Effect.flip),
    client(failDistTags(500), calls),
  )
  assert.strictEqual(error._tag, "NpmRegistryError")
  assert.strictEqual(distTagCalls(calls), 3)
})

test("a 404 is not retried", async () => {
  const calls: Array<string> = []
  const error = await run(
    published().pipe(Effect.flip),
    client(failDistTags(404), calls),
  )
  assert.strictEqual(error._tag, "NpmRegistryError")
  assert.strictEqual(distTagCalls(calls), 1)
})

test("a malformed body is not retried", async () => {
  const calls: Array<string> = []
  const error = await run(
    published().pipe(Effect.flip),
    client(() => Response.json({ unexpected: true }), calls),
  )
  assert.strictEqual(error._tag, "NpmRegistryError")
  assert.strictEqual(calls.length, 2)
})

test("a packument that lags the dist-tag fails", async () => {
  const error = await run(
    published().pipe(Effect.flip),
    client((url) =>
      url.pathname.endsWith("/dist-tags")
        ? Response.json({ latest: "4.0.8" })
        : Response.json({ time: { "4.0.7": "2026-10-28T03:36:20.753Z" } }),
    ),
  )
  assert.strictEqual(error._tag, "NpmRegistryError")
  assert.include(String(error.cause), "4.0.8")
})
