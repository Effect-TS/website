import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/** The Workers rate-limit binding. Its limit and period are set in `alchemy.run.ts`. */
export interface RateLimitBinding {
  readonly limit: (options: {
    readonly key: string
  }) => Promise<{ readonly success: boolean }>
}

/**
 * Whether a client may make one more request. Cloudflare keeps the counts, so
 * nothing about the client is stored here.
 */
export class ClientRateLimit extends Context.Service<
  ClientRateLimit,
  { readonly allow: (key: string) => Effect.Effect<boolean> }
>()("motw-vote/ClientRateLimit") {}

export const layer = (binding: RateLimitBinding) =>
  Layer.succeed(ClientRateLimit, {
    allow: (key) =>
      Effect.map(
        Effect.promise(() => binding.limit({ key })),
        ({ success }) => success,
      ),
  })

/** For `astro dev`, which has no binding. */
export const unlimited = Layer.succeed(ClientRateLimit, {
  allow: () => Effect.succeed(true),
})
