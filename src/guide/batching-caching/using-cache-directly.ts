import { Effect, Cache } from "effect"

declare const intensiveWork: (
  key: string
) => Effect.Effect<never, never, string>

const program = Effect.gen(function* ($) {
  const cache = yield* $(
    Cache.make({
      capacity: Number.MAX_SAFE_INTEGER,
      timeToLive: Infinity,
      lookup: intensiveWork,
    })
  )

  const a0 = yield* $(cache.get("key0"))
  const b0 = yield* $(cache.get("key1"))
  const a1 = yield* $(cache.get("key0"))
  const b1 = yield* $(cache.get("key1"))

  if (a0 === a1 && b0 === b1) {
    yield* $(Effect.log("I'll always end up here...."))
  }
})
