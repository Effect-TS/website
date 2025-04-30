import * as Crypto from "node:crypto"
import * as KVS from "@effect/platform/KeyValueStore"
import * as Effect from "effect/Effect"
import { VercelOrMemoryKVS as VercelOrMemoryKVSLive } from "../kvs"
import { ShortenError } from "./domain"

const constMaxSize = 128 * 1024

export class Shorten extends Effect.Service<Shorten>()("app/Shorten", {
  accessors: true,
  dependencies: [VercelOrMemoryKVSLive],
  effect: Effect.gen(function* () {
    const kvs = yield* KVS.KeyValueStore
    const store = KVS.prefix(kvs, "shorten/")

    const shorten = (thing: string) =>
      Effect.gen(function* () {
        if (thing.length > constMaxSize) {
          return yield* new ShortenError({
            reason: "TooLarge",
            method: "shorten"
          })
        }
        const hash = Crypto.createHash("sha256").update(thing).digest("hex").slice(0, 12)
        if (yield* store.has(hash)) {
          return hash
        }
        yield* store.set(hash, thing)
        return hash
      }).pipe(
        Effect.catchIf(
          (err) => err._tag !== "ShortenError",
          (_) =>
            new ShortenError({
              reason: "Unknown",
              method: "shorten"
            })
        )
      )

    const retrieve = (hash: string) =>
      store.get(hash).pipe(
        Effect.mapError(
          (_) =>
            new ShortenError({
              reason: "Unknown",
              method: "retrieve"
            })
        )
      )

    return {
      shorten,
      retrieve
    } as const
  })
}) {}
