import { Context, Effect, Layer } from "effect"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import * as Crypto from "node:crypto"
import { ShortenKVS } from "../kvs"
import { ShortenError } from "./domain"

const constMaxSize = 128 * 1024

export class Shorten extends Context.Service<Shorten>()("app/Shorten", {
  make: Effect.gen(function* () {
    const kvs = yield* KeyValueStore.KeyValueStore
    const store = KeyValueStore.prefix(kvs, "shorten/")

    const shorten = (thing: string) =>
      Effect.gen(function* () {
        if (thing.length > constMaxSize) {
          return yield* new ShortenError({
            reason: "TooLarge",
            method: "shorten",
          })
        }
        const hash = Crypto.createHash("sha256")
          .update(thing)
          .digest("hex")
          .slice(0, 12)
        if (yield* store.has(hash)) {
          return hash
        }
        yield* store.set(hash, thing)
        return hash
      }).pipe(
        Effect.catchIf(
          (err) => err._tag !== "ShortenError",
          (_) => new ShortenError({ reason: "Unknown", method: "shorten" }),
        ),
      )

    const retrieve = (hash: string) =>
      store
        .get(hash)
        .pipe(
          Effect.mapError(
            (_) => new ShortenError({ reason: "Unknown", method: "retrieve" }),
          ),
        )

    return { shorten, retrieve } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(ShortenKVS),
  )
}
