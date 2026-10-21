import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class TurnstileError extends Data.TaggedError("TurnstileError")<{
  readonly cause: unknown
}> {}

/** Cloudflare Turnstile, the human check a vote needs. */
export class Turnstile extends Context.Service<
  Turnstile,
  {
    /** The public key the browser renders the check with. */
    readonly siteKey: string
    /** Whether a token came from a check that was solved. A token works once. */
    readonly verify: (token: string) => Effect.Effect<boolean, TurnstileError>
  }
>()("website/Turnstile") {}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export const siteverifyLayer = (siteKey: string, secret: string) =>
  Layer.succeed(Turnstile, {
    siteKey,
    verify: (token) =>
      Effect.tryPromise({
        try: async () => {
          const body = new FormData()
          body.set("secret", secret)
          body.set("response", token)
          const response = await fetch(SITEVERIFY, { method: "POST", body })
          const result = (await response.json()) as {
            readonly success?: boolean
          }
          return result.success === true
        },
        catch: (cause) => new TurnstileError({ cause }),
      }),
  })
