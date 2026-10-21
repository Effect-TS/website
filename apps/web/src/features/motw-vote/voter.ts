import { createHmac, timingSafeEqual } from "node:crypto"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

// A UUID, a dot, and an unpadded base64url SHA-256: 43 characters
const TOKEN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/

/** Issues and checks the voter cookie: a voter id signed with the server's secret. */
export class VoterSigner extends Context.Service<VoterSigner>()(
  "motw-vote/VoterSigner",
  {
    make: Effect.gen(function* () {
      const secret = yield* Config.Redacted("MOTW_VOTE_SECRET")

      const sign = (id: string) =>
        createHmac("sha256", Redacted.value(secret))
          .update(id)
          .digest("base64url")

      /** A new voter and the cookie value that names it. */
      const issue = Effect.sync(() => crypto.randomUUID()).pipe(
        Effect.map((id) => ({ id, token: `${id}.${sign(id)}` })),
      )

      /** The voter a cookie value names, if the server issued it. */
      const verify = (token: string): Option.Option<string> =>
        Option.fromNullishOr(TOKEN.exec(token)).pipe(
          Option.filter(([, id = "", signature = ""]) =>
            timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id))),
          ),
          Option.map(([, id = ""]) => id),
        )

      return { issue, verify } as const
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
