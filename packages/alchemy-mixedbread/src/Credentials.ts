import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"

export interface ResolvedCredentials {
  readonly apiKey: Redacted.Redacted<string>
  readonly baseUrl: string | undefined
}

export class Credentials extends Context.Service<
  Credentials,
  Effect.Effect<ResolvedCredentials>
>()("Mixedbread/Credentials") {}

export const fromEnv = Layer.effect(
  Credentials,
  Effect.cached(
    Effect.orDie(
      Config.all({
        apiKey: Config.redacted("MXBAI_ADMIN_API_KEY"),
        baseUrl: Config.option(Config.string("MIXEDBREAD_BASE_URL")).pipe(
          Config.map(Option.getOrUndefined),
        ),
      }),
    ),
  ),
)
