import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"

const VercelKVS = Layer.unwrap(
  Effect.gen(function* () {
    if (process.env.NODE_ENV === "development") {
      return KeyValueStore.layerMemory
    }
    const config = yield* Config.all({
      url: Config.string("KV_REST_API_URL"),
      token: Config.redacted("KV_REST_API_TOKEN"),
    })
    return makeVercelKVS(config.url, config.token)
  }),
)

const makeVercelKVS = (url: string, token: Redacted.Redacted) =>
  Layer.effect(
    KeyValueStore.KeyValueStore,
    Effect.gen(function* () {
      const { Redis } = yield* Effect.promise(() => import("@upstash/redis"))
      const kv = new Redis({ url, token: Redacted.value(token) })

      return KeyValueStore.makeStringOnly({
        get: (key) =>
          Effect.tryPromise({
            try: () => kv.get<string>(key),
            catch: (cause) =>
              new KeyValueStore.KeyValueStoreError({
                message: "Failed to get key",
                method: "get",
                key,
                cause,
              }),
          }).pipe(Effect.map((v) => v ?? undefined)),
        set: (key, value) =>
          Effect.tryPromise({
            try: () => kv.set(key, value),
            catch: (cause) =>
              new KeyValueStore.KeyValueStoreError({
                message: "Failed to set key",
                method: "set",
                key,
                cause,
              }),
          }).pipe(Effect.asVoid),
        remove: (key) =>
          Effect.tryPromise({
            try: () => kv.del(key),
            catch: (cause) =>
              new KeyValueStore.KeyValueStoreError({
                message: "Failed to remove key",
                method: "remove",
                key,
                cause,
              }),
          }).pipe(Effect.asVoid),
        clear: Effect.void,
        size: Effect.tryPromise({
          try: () => kv.keys("*"),
          catch: (cause) =>
            new KeyValueStore.KeyValueStoreError({
              message: "Failed to get size",
              method: "size",
              cause,
            }),
        }).pipe(Effect.map((keys) => keys.length)),
      })
    }),
  )

export const ShortenKVS = VercelKVS
