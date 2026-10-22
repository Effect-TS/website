import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { NpmDownloads } from "../../../src/features/npm-downloads/service.ts"

const week = (monday: string, downloads: number) =>
  Array.from({ length: 7 }, (_, index) => ({
    day: new Date(Date.parse(monday) + index * 86_400_000)
      .toISOString()
      .slice(0, 10),
    downloads,
  }))

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

const run = <A, E>(
  effect: Effect.Effect<A, E, NpmDownloads>,
  http: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        NpmDownloads.layerWithRetryDelay(Schedule.recurs(5)).pipe(
          Layer.provide(http),
        ),
      ),
    ),
  )

const now = new Date("2026-10-22T12:00:00Z")

test("weekly totals come from the range endpoint", async () => {
  const calls: Array<string> = []
  const weeks = await run(
    Effect.gen(function* () {
      const npm = yield* NpmDownloads
      return yield* npm.weekly({
        packageName: "effect",
        from: "2026-10-05",
        now,
      })
    }),
    client(
      () =>
        Response.json({
          downloads: [...week("2026-10-05", 1), ...week("2026-10-12", 2)],
        }),
      calls,
    ),
  )
  assert.deepEqual(weeks, [
    { weekStart: "2026-10-05", downloads: 7 },
    { weekStart: "2026-10-12", downloads: 14 },
  ])
  assert.deepEqual(calls, ["/downloads/range/2026-10-05:2026-10-18/effect"])
})

test("long histories are split into several requests", async () => {
  const calls: Array<string> = []
  await run(
    Effect.gen(function* () {
      const npm = yield* NpmDownloads
      return yield* npm.weekly({
        packageName: "effect",
        from: "2024-04-15",
        now,
      })
    }),
    client(() => Response.json({ downloads: [] }), calls),
  )
  assert.equal(calls.length, 2)
})

test("a failed request is retried", async () => {
  let failures = 1
  const weeks = await run(
    Effect.gen(function* () {
      const npm = yield* NpmDownloads
      return yield* npm.weekly({
        packageName: "effect",
        from: "2026-10-05",
        now,
      })
    }),
    client(() =>
      failures-- > 0
        ? new Response("unavailable", { status: 503 })
        : Response.json({ downloads: week("2026-10-05", 3) }),
    ),
  )
  assert.deepEqual(weeks, [{ weekStart: "2026-10-05", downloads: 21 }])
})

test("fails with NpmDownloadsError once retries are exhausted", async () => {
  const error = await run(
    Effect.gen(function* () {
      const npm = yield* NpmDownloads
      return yield* npm
        .weekly({ packageName: "effect", from: "2026-10-05", now })
        .pipe(Effect.flip)
    }),
    client(() => new Response("down", { status: 500 })),
  )
  assert.equal(error._tag, "NpmDownloadsError")
})

test("a malformed body fails with NpmDownloadsError", async () => {
  const error = await run(
    Effect.gen(function* () {
      const npm = yield* NpmDownloads
      return yield* npm
        .weekly({ packageName: "effect", from: "2026-10-05", now })
        .pipe(Effect.flip)
    }),
    client(() => Response.json({ unexpected: true })),
  )
  assert.equal(error._tag, "NpmDownloadsError")
})
