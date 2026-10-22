import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Base64Url from "effect/encoding/Base64Url"

// A UUID, a dot, and an unpadded base64url SHA-256: 43 characters
const TOKEN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/

const encoder = new TextEncoder()

export const SecureCookie = Context.Reference<boolean>(
  "motw-vote/SecureCookie",
  { defaultValue: () => true },
)

export class VoterSigner extends Context.Service<VoterSigner>()(
  "motw-vote/VoterSigner",
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
