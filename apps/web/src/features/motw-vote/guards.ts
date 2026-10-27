import * as Config from "effect/Config"
import type { ConfigError } from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Base64Url from "effect/encoding/Base64Url"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

// A UUID, a dot, and an unpadded base64url SHA-256: 43 characters
const TOKEN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/

const encoder = new TextEncoder()

export const SecureCookie = Context.Reference<boolean>("website/SecureCookie", {
  defaultValue: () => true,
})

export class VoterSigner extends Context.Service<VoterSigner>()(
  "website/VoterSigner",
  {
    make: Effect.gen(function* () {
      const secret = yield* Config.Redacted("MOTW_VOTE_SECRET")
      const key = yield* Effect.promise(() =>
        crypto.subtle.importKey(
          "raw",
          encoder.encode(Redacted.value(secret)),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign", "verify"],
        ),
      )

      const sign = (id: string) =>
        Effect.promise(() =>
          crypto.subtle.sign("HMAC", key, encoder.encode(id)),
        ).pipe(
          Effect.map((signature) =>
            Base64Url.encode(new Uint8Array(signature)),
          ),
        )

      const issue = Effect.gen(function* () {
        const id = crypto.randomUUID()
        return { id, token: `${id}.${yield* sign(id)}` }
      })

      const verify = Effect.fnUntraced(function* (token: string) {
        const [, id = "", signature = ""] = TOKEN.exec(token) ?? []
        const bytes = Result.getOrUndefined(Base64Url.decode(signature))
        if (bytes === undefined) return Option.none<string>()
        const valid = yield* Effect.promise(() =>
          crypto.subtle.verify(
            "HMAC",
            key,
            new Uint8Array(bytes),
            encoder.encode(id),
          ),
        )
        return valid ? Option.some(id) : Option.none<string>()
      })

      return { issue, verify } as const
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}

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
>()("website/ClientRateLimit") {
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
>()("website/Turnstile") {
  static readonly layerNoDeps: Layer.Layer<
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

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide(FetchHttpClient.layer),
  )
}
