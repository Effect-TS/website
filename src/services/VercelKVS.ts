import * as KVS from "@effect/platform/KeyValueStore"
import { SystemError } from "@effect/platform/Error"
import { Config, Effect, Layer, Option, Secret } from "effect"

const make = (url: string, token: Secret.Secret) =>
  Effect.gen(function* () {
    const { createClient } = yield* Effect.promise(() => import("@vercel/kv"))
    const kv = createClient({ url, token: Secret.value(token) })
    return KVS.make({
      get: (key) =>
        Effect.tryPromise({
          try: () => kv.get<string>(key),
          catch: (error) =>
            SystemError({
              module: "KeyValueStore",
              method: "get",
              reason: "Unknown",
              pathOrDescriptor: key,
              message: String(error)
            })
        }).pipe(Effect.map(Option.fromNullable)),
      set: (key, value) =>
        Effect.tryPromise({
          try: () => kv.set<string>(key, value),
          catch: (error) =>
            SystemError({
              module: "KeyValueStore",
              method: "set",
              reason: "Unknown",
              pathOrDescriptor: key,
              message: String(error)
            })
        }).pipe(Effect.asVoid),
      remove: (key) =>
        Effect.tryPromise({
          try: () => kv.del(key),
          catch: (error) =>
            SystemError({
              module: "KeyValueStore",
              method: "remove",
              reason: "Unknown",
              pathOrDescriptor: key,
              message: String(error)
            })
        }).pipe(Effect.asVoid),
      clear: Effect.void,
      size: Effect.tryPromise({
        try: () => kv.keys("*"),
        catch: (error) =>
          SystemError({
            module: "KeyValueStore",
            method: "size",
            reason: "Unknown",
            pathOrDescriptor: "",
            message: String(error)
          })
      }).pipe(Effect.map((keys) => keys.length))
    })
  })

export const VercelKVSLive = (url: string, token: Secret.Secret) =>
  Layer.effect(KVS.KeyValueStore, make(url, token))

export const VercelOrMemoryKVS = Layer.unwrapEffect(
  Effect.gen(function* (_) {
    if (process.env.NODE_ENV === "development") return KVS.layerMemory
    const config = yield* Config.all({
      url: Config.string("KV_REST_API_URL"),
      token: Config.secret("KV_REST_API_TOKEN")
    })
    return VercelKVSLive(config.url, config.token)
  })
)
