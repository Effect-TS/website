import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Command from "alchemy/Command"
import * as GitHub from "alchemy/GitHub"
import * as Output from "alchemy/Output"
import * as Mixedbread from "@website/alchemy-mixedbread"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

type StoreId = Config.Config<Redacted.Redacted<string>> | Output.Output<string>

// Cloudflare's test keys for an invisible check that always passes.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000BB"
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA"

// Rate-limit namespaces are numbers. Each stage counts in its own, so a preview
// cannot use up the production limit.
const rateLimitNamespaceId = (stage: string): number => {
  let hash = 0
  for (const char of stage) hash = (hash * 31 + char.charCodeAt(0)) % 90_000
  return 1_000 + hash
}

const Website = (
  storeId: StoreId,
  searchApiKey: Config.Config<Redacted.Redacted<string>>,
) =>
  Cloudflare.Website.Astro(
    "WebsiteWorker",
    Effect.gen(function* () {
      const stage = yield* Alchemy.Stage

      // Module of the Week votes. Previews get their own empty database, which
      // goes away with the preview. Production keeps its votes if the stack is
      // ever destroyed.
      const moduleVotes = yield* Cloudflare.D1.Database("ModuleVotes", {
        migrations: "./apps/web/migrations",
      }).pipe(Alchemy.RemovalPolicy.retain(stage === "prod"))

      // Signs the cookie that tells voters apart. It is made once per stage and
      // kept in the deploy state.
      const votesSecret = yield* Alchemy.Random("ModuleVotesSecret")

      // The invisible human check votes need. Production gets a real widget.
      // Other stages use Cloudflare's test keys, whose check always passes,
      // because a widget only runs on the hostnames it lists.
      const turnstile =
        stage === "prod"
          ? yield* Cloudflare.Turnstile.Widget("ModuleVotesTurnstile", {
              domains: ["effect.website"],
              mode: "invisible",
            })
          : undefined

      return {
        rootDir: "./apps/web",
        memo: {
          include: [
            ".alchemy-build-input.json",
            ".data/api-reference/**",
            "src/**",
            "public/**",
            "astro.config.ts",
            "package.json",
            "tsconfig.json",
          ],
          exclude: ["dist/**", ".astro/**", "node_modules/**"],
          lockfile: true,
          workspaces: "auto" as const,
        },
        astro: { output: "static" as const },
        assets: {
          htmlHandling: "drop-trailing-slash" as const,
          // Route the PostHog proxy through the Worker before the asset layer.
          runWorkerFirst: ["/_ingest/*"],
        },
        ...(stage === "prod"
          ? {
              domain: {
                name: "effect.website",
                redirects: ["www.effect.website"],
              },
              routes: [],
            }
          : {}),
        workersDev: true,
        dev: { port: 14337, strictPort: true },
        cache: {
          enabled: true,
          crossVersionCache: true,
        },
        env: {
          MXBAI_API_KEY: searchApiKey,
          MXBAI_VECTOR_STORE_ID: storeId,
          KV_REST_API_URL: Config.Redacted("KV_REST_API_URL"),
          KV_REST_API_TOKEN: Config.Redacted("KV_REST_API_TOKEN"),
          DB: moduleVotes,
          MODULE_VOTES_SECRET: votesSecret.text,
          TURNSTILE_SITE_KEY: turnstile?.sitekey ?? TURNSTILE_TEST_SITE_KEY,
          TURNSTILE_SECRET:
            turnstile?.secret ?? Redacted.make(TURNSTILE_TEST_SECRET),
          MODULE_VOTES_LIMIT: Cloudflare.RateLimit("MODULE_VOTES_LIMIT", {
            namespaceId: rateLimitNamespaceId(stage),
            simple: { limit: 20, period: 60 },
          }),
        },
        sessionKVBindingName: false,
        prerenderEnvironment: "node" as const,
      }
    }),
  )

export default Alchemy.Stack(
  "EffectWebsite",
  {
    providers: Layer.mergeAll(
      Cloudflare.providers(),
      GitHub.providers(),
      Mixedbread.providers(),
    ),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const pullRequest = yield* Config.option(Config.Int("PULL_REQUEST"))
    const previewStoreEnabled = yield* Config.Boolean(
      "MXBAI_PREVIEW_STORE_ENABLED",
    ).pipe(Config.withDefault(false))
    const sha = yield* Config.String("WEBSITE_REVISION")
    let storeId: StoreId = Config.Redacted("MXBAI_VECTOR_STORE_ID")
    let searchApiKey = Config.Redacted("MXBAI_API_KEY")

    if (previewStoreEnabled && Option.isSome(pullRequest)) {
      const store = yield* Mixedbread.VectorStore("PreviewSearchStore", {
        name: `effect-website-pr-${pullRequest.value}`,
        description: `Effect website search preview for PR ${pullRequest.value}`,
        expiresAfter: { anchor: "last_active_at", days: 7 },
        tags: ["effect-website-preview"],
        // Start from production's index so the sync below only uploads what
        // the pull request changed and deletes what it doesn't have.
        copyFrom: Config.Redacted("MXBAI_VECTOR_STORE_ID"),
        metadata: {
          lifecycle: "pull-request-preview",
          pullRequest: pullRequest.value,
          repository: "Effect-TS/website",
        },
        config: {
          contextualization: {
            with_file_context: true,
            with_metadata: ["file_path"],
          },
        },
      })
      const synchronization = yield* Command.Exec("SynchronizePreviewSearch", {
        command: `vp exec mixedbread sync --pr ${pullRequest.value} --sha ${sha}`,
        env: {
          MXBAI_VECTOR_STORE_ID: store.id,
        },
        memo: {
          include: [
            "apps/web/src/content/docs/**",
            "apps/web/src/content/blog/**",
            "apps/web/src/content.config.ts",
            "apps/web/.data/api-reference/**",
            "apps/web/src/features/api-reference/**",
            "apps/web/src/features/search/domain.ts",
            "packages/api-reference/**",
            "packages/domain/**",
            "packages/mixedbread/**",
            "pnpm-lock.yaml",
          ],
        },
        timeout: "30 minutes",
      })
      storeId = Output.all(store.id, synchronization.hash.input).pipe(
        Output.map(([id]) => id),
      )
      // The production search key is scoped to the production store. Mixedbread
      // only issues API keys from its web app, so preview stores share a key
      // created there that can search any store tagged `effect-website-preview`.
      searchApiKey = Config.Redacted("MXBAI_PREVIEW_SEARCH_API_KEY")
    }

    const website = yield* Website(storeId, searchApiKey)

    yield* Option.match(pullRequest, {
      onNone: () => Effect.void,
      onSome: (issueNumber) =>
        Effect.gen(function* () {
          yield* GitHub.Comment("preview-comment", {
            owner: "Effect-TS",
            repository: "website",
            issueNumber,
            body: Output.interpolate`
              ## Cloudflare Preview

              **URL:** ${website.url}

              Built from commit [${sha.slice(0, 7)}](https://github.com/Effect-TS/website/commit/${sha}).

              ---
              _This comment updates automatically with each deployment._
            `,
          })
        }),
    })

    return {
      workerName: website.workerName,
      websiteUrl: website.url,
    }
  }),
)
