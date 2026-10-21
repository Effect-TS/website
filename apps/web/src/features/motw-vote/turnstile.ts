import * as Config from "effect/Config"
import type { ConfigError } from "effect/Config"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

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

export const SITEVERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

const Siteverify = Schema.Struct({ success: Schema.Boolean })

/**
 * Turnstile from the `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` config. A
 * request that fails, answers with a status outside 2xx, answers with a body
 * that is not `{ success }`, or takes over 5 seconds fails with
 * `TurnstileError`.
 */
export const layer: Layer.Layer<Turnstile, ConfigError, HttpClient.HttpClient> =
  Layer.effect(
    Turnstile,
    Effect.gen(function* () {
      const siteKey = yield* Config.String("TURNSTILE_SITE_KEY")
      const secret = yield* Config.Redacted("TURNSTILE_SECRET")
      const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient)

      const verify = Effect.fn("Turnstile.verify")((token: string) =>
        client
          .execute(
            HttpClientRequest.post(SITEVERIFY).pipe(
              HttpClientRequest.bodyUrlParams({
                secret: Redacted.value(secret),
                response: token,
              }),
            ),
          )
          .pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Siteverify)),
            Effect.map(({ success }) => success),
            Effect.timeout("5 seconds"),
            Effect.mapError((cause) => new TurnstileError({ cause })),
          ),
      )

      return Turnstile.of({ siteKey, verify })
    }),
  )
