import * as KVS from "@effect/platform/KeyValueStore"
import { Context, Effect, Layer } from "effect"
import { VercelOrMemoryKVS as VercelOrMemoryKVSLive } from "./VercelKVS"
import * as Crypto from "node:crypto"

const make = Effect.gen(function* (_) {
  const kvs = yield* KVS.KeyValueStore
  const store = KVS.prefix(kvs, "shorten/")

  const shorten = (thing: string) =>
    Effect.gen(function* (_) {
      const hash = Crypto.createHash("sha256")
        .update(thing)
        .digest("hex")
        .slice(0, 12)
      if (yield* store.has(hash)) {
        return hash
      }
      yield* store.set(hash, thing)
      return hash
    })

  const retrieve = (hash: string) => store.get(hash)

  return { shorten, retrieve } as const
})

export class Shorten extends Context.Tag("app/Shorten")<
  Shorten,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(Shorten, make).pipe(
    Layer.provide(VercelOrMemoryKVSLive)
  )
}
