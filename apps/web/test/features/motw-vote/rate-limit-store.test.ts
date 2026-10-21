import { assert, describe, test } from "vite-plus/test"
import * as D1Client from "@effect/sql-d1/D1Client"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import * as TestClock from "effect/testing/TestClock"
import { layer as storeLayer } from "../../../src/features/motw-vote/rate-limit-store.ts"
import { sqliteD1 } from "./sqlite-d1.ts"

const limiter = () =>
  RateLimiter.layer.pipe(
    Layer.provide(storeLayer),
    Layer.provide(D1Client.layer({ db: sqliteD1() })),
    Layer.provideMerge(TestClock.layer()),
  )

const run = <A, E>(
  effect: Effect.Effect<A, E, RateLimiter.RateLimiter | TestClock.TestClock>,
) => Effect.runPromise(effect.pipe(Effect.provide(limiter())))

const options = (key: string) =>
  ({
    key,
    limit: 3,
    window: "1 minute",
    onExceeded: "fail",
  }) as const

const exceeded = (
  effect: Effect.Effect<unknown, RateLimiter.RateLimiterError>,
) =>
  effect.pipe(
    Effect.flip,
    Effect.map((error) => error.reason),
  )

describe("rate limit store on SQL", () => {
  test("allows the limit, then fails", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        const remaining = yield* Effect.forEach([1, 2, 3], () =>
          limiter.consume(options("a")).pipe(Effect.map((r) => r.remaining)),
        )
        assert.deepStrictEqual(remaining, [2, 1, 0])
        const reason = yield* exceeded(limiter.consume(options("a")))
        assert.strictEqual(reason._tag, "RateLimitExceeded")
        assert.strictEqual(
          reason._tag === "RateLimitExceeded"
            ? Duration.toMillis(reason.retryAfter)
            : -1,
          60_000,
        )
      }),
    ))

  test("keeps keys apart", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        yield* Effect.forEach([1, 2, 3], () => limiter.consume(options("a")))
        yield* exceeded(limiter.consume(options("a")))
        const other = yield* limiter.consume(options("b"))
        assert.strictEqual(other.remaining, 2)
      }),
    ))

  test("keeps failing while rejected requests keep coming", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        yield* Effect.forEach([1, 2, 3], () => limiter.consume(options("a")))
        yield* Effect.forEach([1, 2, 3, 4], () =>
          exceeded(limiter.consume(options("a"))),
        )
        yield* TestClock.adjust("59 seconds")
        yield* exceeded(limiter.consume(options("a")))
      }),
    ))

  test("a new window resets the count", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        yield* Effect.forEach([1, 2, 3], () => limiter.consume(options("a")))
        yield* exceeded(limiter.consume(options("a")))
        yield* TestClock.adjust("1 minute")
        const fresh = yield* limiter.consume(options("a"))
        assert.strictEqual(fresh.remaining, 2)
      }),
    ))

  test("concurrent requests never pass the limit", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        const results = yield* Effect.forEach(
          Array.from({ length: 10 }),
          () => limiter.consume(options("a")).pipe(Effect.result),
          { concurrency: "unbounded" },
        )
        assert.strictEqual(
          results.filter((r) => r._tag === "Success").length,
          3,
        )
      }),
    ))

  test("delays instead of failing when asked to", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        const delays = yield* Effect.forEach([1, 2, 3, 4], () =>
          limiter
            .consume({ ...options("a"), onExceeded: "delay" })
            .pipe(Effect.map((r) => Duration.toMillis(r.delay))),
        )
        assert.deepStrictEqual(delays.slice(0, 3), [0, 0, 0])
        assert.isAbove(delays[3] ?? 0, 0)
      }),
    ))

  test("token buckets are not supported", () =>
    run(
      Effect.gen(function* () {
        const limiter = yield* RateLimiter.RateLimiter
        const reason = yield* exceeded(
          limiter.consume({ ...options("a"), algorithm: "token-bucket" }),
        )
        assert.strictEqual(reason._tag, "RateLimitStoreError")
      }),
    ))
})
