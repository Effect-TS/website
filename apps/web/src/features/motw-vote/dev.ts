import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ModuleCatalog } from "./catalog"
import { ClientRateLimit, SecureCookie } from "./guards"
import { TURNSTILE_TEST_KEYS } from "./turnstile-test-keys"
import * as AstroContent from "./http"
import { VoteData } from "./vote-data"
import { VoteStore } from "./vote-store"

// Only `server.ts` imports this file, and only in development, so a build
// leaves `astro:content` out of the Worker.
export const layer = Layer.mergeAll(
  VoteStore.layerMemory,
  ClientRateLimit.layerUnlimited,
  Layer.unwrap(
    Effect.gen(function* () {
      const { data } = yield* VoteData
      return ModuleCatalog.layerFrom(data)
    }),
  ).pipe(Layer.provide(AstroContent.layer)),
  Layer.succeed(SecureCookie, false),
  ConfigProvider.layerAdd(
    ConfigProvider.fromEnvRecord({
      MOTW_VOTE_SECRET: "development-only-secret",
      TURNSTILE_SITE_KEY: TURNSTILE_TEST_KEYS.siteKey,
      TURNSTILE_SECRET: TURNSTILE_TEST_KEYS.secret,
    }),
    { asPrimary: false },
  ),
)
