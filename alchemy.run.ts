import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Command from "alchemy/Command"
import * as GitHub from "alchemy/GitHub"
import type { Input } from "alchemy/Input"
import * as Output from "alchemy/Output"
import * as Mixedbread from "@website/alchemy-mixedbread"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

const TrafficMode = Schema.Literals([
  "workers-dev",
  "routes",
  "bridge",
  "custom-domains",
])

const Website = (storeId: Input<string | Redacted.Redacted<string>>) =>
  Cloudflare.Website.Astro(
    "WebsiteWorker",
    Effect.gen(function* () {
      const stage = yield* Alchemy.Stage
      const trafficMode =
        stage === "prod"
          ? yield* Config.schema(TrafficMode, "CLOUDFLARE_TRAFFIC_MODE").pipe(
              Config.withDefault("workers-dev"),
              Effect.orDie,
            )
          : "workers-dev"
      const domainEnabled =
        trafficMode === "bridge" || trafficMode === "custom-domains"
      const routeEnabled = trafficMode === "routes" || trafficMode === "bridge"

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
              domain: domainEnabled
                ? {
                    name: "effect.website",
                    redirects: ["www.effect.website"],
                  }
                : null,
              routes: routeEnabled
                ? [
                    {
                      pattern: "effect.website/*",
                      zoneName: "effect.website",
                    },
                  ]
                : [],
            }
          : {}),
        workersDev: true,
        dev: { port: 14337, strictPort: true },
        cache: {
          enabled: true,
          crossVersionCache: true,
        },
        env: {
          MXBAI_API_KEY: Config.redacted("MXBAI_API_KEY"),
          MXBAI_VECTOR_STORE_ID: storeId,
          KV_REST_API_URL: Config.redacted("KV_REST_API_URL"),
          KV_REST_API_TOKEN: Config.redacted("KV_REST_API_TOKEN"),
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
    const pullRequest = yield* Config.option(Config.int("PULL_REQUEST"))
    const previewStoreEnabled = yield* Config.boolean(
      "MXBAI_PREVIEW_STORE_ENABLED",
    ).pipe(Config.withDefault(false))
    const sha = yield* Config.string("WEBSITE_REVISION")
    let storeId: Input<string | Redacted.Redacted<string>> = Config.redacted(
      "MXBAI_VECTOR_STORE_ID",
    )

    if (previewStoreEnabled && Option.isSome(pullRequest)) {
      const store = yield* Mixedbread.VectorStore("PreviewSearchStore", {
        name: `effect-website-pr-${pullRequest.value}`,
        description: `Effect website search preview for PR ${pullRequest.value}`,
        expiresAfter: { anchor: "last_active_at", days: 7 },
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
    }

    const website = yield* Website(storeId)

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
