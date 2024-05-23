import { PlatformError } from "@effect/platform/Error"
import * as KVS from "@effect/platform/KeyValueStore"
import { Context, Effect, Layer, Option } from "effect"
import Sqids from "sqids"
import { VercelOrMemoryKVS as VercelOrMemoryKVSLive } from "./VercelKVS"

const make = Effect.gen(function* (_) {
  const kvs = yield* KVS.KeyValueStore
  const cache = KVS.prefix(kvs, "shorten-cache/")
  const store = KVS.prefix(kvs, "shorten/")
  const sqids = new Sqids()
  const random = yield* Effect.random

  const generate = (thing: string): Effect.Effect<string, PlatformError> =>
    Effect.gen(function* (_) {
      const cached = yield* cache.get(thing)
      if (Option.isSome(cached)) {
        return cached.value
      }
      const numbers = yield* Effect.replicateEffect(random.nextInt, 3)
      const hash = sqids.encode(numbers)
      if (yield* store.has(hash)) {
        return yield* generate(thing)
      }
      yield* cache.set(thing, hash)
      yield* store.set(hash, thing)
      return hash
    })

  const retrieve = (hash: string) => store.get(hash)

  return { generate, retrieve } as const
})

export class Shorten extends Context.Tag("app/Shorten")<
  Shorten,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(Shorten, make).pipe(
    Layer.provide(VercelOrMemoryKVSLive)
  )
}
