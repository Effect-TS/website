import * as Config from "effect/Config"
import type { ConfigError } from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

export const SITEVERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

const Siteverify = Schema.Struct({ success: Schema.Boolean })

/**
 * A request that fails, answers outside 2xx, answers a body that is not
 * `{ success }`, or takes over 5 seconds is a defect.
 */
export class Turnstile extends Context.Service<
  Turnstile,
  {
    /** The public key the browser renders the check with. */
    readonly siteKey: string
    /** Whether a token came from a solved check. A token works once. */
    readonly verify: (token: string) => Effect.Effect<boolean>
  }
>()("motw-vote/Turnstile") {
  static readonly layer: Layer.Layer<
    Turnstile,
    ConfigError,
    HttpClient.HttpClient
  > = Layer.effect(
    this,
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
            Effect.orDie,
          ),
      )

      return Turnstile.of({ siteKey, verify })
    }),
  )
}
