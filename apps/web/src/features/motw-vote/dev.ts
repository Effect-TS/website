import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ModuleCatalog } from "./catalog"
import { ClientRateLimit } from "./rate-limit"
import { TURNSTILE_TEST_KEYS } from "./turnstile-test-keys"
import { getVoteData } from "./vote-data"
import { SecureCookie } from "./voter"
import { VoteStore } from "./vote-store"

// Only `server.ts` imports this file, and only in development, so a build
// leaves `astro:content` out of the Worker.
export const layer = Layer.mergeAll(
  VoteStore.layerMemory,
  ClientRateLimit.layerUnlimited,
  ModuleCatalog.layerFrom(Effect.tryPromise(getVoteData)),
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
