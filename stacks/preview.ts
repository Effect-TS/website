import * as Alchemy from "alchemy"
import * as Cloudflare from "@alchemy.run/cloudflare"
import { TURNSTILE_TEST_KEYS } from "../apps/web/src/features/motw-vote/turnstile-test-keys.ts"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import {
  DEFAULT_PREVIEW_ARTIFACT_DIR,
  validatePreviewArtifact,
} from "./preview-artifact.ts"
import {
  rateLimitNamespaceId,
  WEBSITE_ASSETS_CONFIG,
  WEBSITE_CACHE_CONFIG,
} from "./website-config.ts"

const RequestedPreviewWebsite = Cloudflare.Worker(
  "WebsiteWorker",
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stage
    const artifactDir = yield* Config.String("PREVIEW_ARTIFACT_DIR").pipe(
      Config.withDefault(DEFAULT_PREVIEW_ARTIFACT_DIR),
    )
    const artifact = yield* validatePreviewArtifact(artifactDir).pipe(
      Effect.orDie,
    )

    const motwVote = yield* Cloudflare.D1.Database(
      "MotwVote",
      artifact.migrationsDir === undefined
        ? {}
        : { migrations: artifact.migrationsDir },
    )

    const votesSecret = yield* Alchemy.Random("MotwVoteSecret")

    return {
      main: artifact.entryFile,
      bundle: false as const,
      assets: {
        directory: artifact.clientDir,
        ...WEBSITE_ASSETS_CONFIG,
      },
      workersDev: true,
      cache: WEBSITE_CACHE_CONFIG,
      env: {
        DB: motwVote,
        MOTW_VOTE_SECRET: votesSecret.text,
        TURNSTILE_SITE_KEY: TURNSTILE_TEST_KEYS.siteKey,
        TURNSTILE_SECRET: Redacted.make(TURNSTILE_TEST_KEYS.secret),
        // 20 votes a minute for each client address, isolated from automatic
        // previews and production.
        MOTW_VOTE_LIMIT: Cloudflare.RateLimit("MOTW_VOTE_LIMIT", {
          namespaceId: rateLimitNamespaceId(`requested-${stage}`),
          simple: { limit: 20, period: 60 },
        }),
      },
    }
  }),
)

export default Alchemy.Stack(
  "EffectWebsitePreview",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* RequestedPreviewWebsite

    return {
      workerName: website.workerName,
      websiteUrl: website.url,
    }
  }),
)
