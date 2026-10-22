import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/** The Workers rate-limit binding. Its limit and period are set in `alchemy.run.ts`. */
export interface RateLimitBinding {
  readonly limit: (options: {
    readonly key: string
  }) => Promise<{ readonly success: boolean }>
}

/** Cloudflare keeps the counts, so nothing about the client is stored here. */
export class ClientRateLimit extends Context.Service<
  ClientRateLimit,
  { readonly allow: (key: string) => Effect.Effect<boolean> }
>()("motw-vote/ClientRateLimit") {
  static readonly layer = (binding: RateLimitBinding) =>
    Layer.succeed(this, {
      allow: (key) =>
        Effect.map(
          Effect.promise(() => binding.limit({ key })),
          ({ success }) => success,
        ),
    })

  static readonly layerUnlimited = Layer.succeed(this, {
    allow: () => Effect.succeed(true),
  })
}
