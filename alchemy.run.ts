import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as GitHub from "alchemy/GitHub"
import * as Output from "alchemy/Output"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

export const Website = Cloudflare.Website.Astro(
  "WebsiteWorker",
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stage

    return {
      rootDir: "./apps/web",
      memo: {
        include: [
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
      assets: { htmlHandling: "drop-trailing-slash" as const },
      ...(stage === "prod"
        ? {
            domain: {
              name: "effect.website",
              redirects: ["www.effect.website"],
            },
          }
        : {}),
      workersDev: true,
      cache: {
        enabled: true,
        crossVersionCache: true,
      },
      env: {
        MXBAI_API_KEY: Config.redacted("MXBAI_API_KEY"),
        MXBAI_VECTOR_STORE_ID: Config.redacted("MXBAI_VECTOR_STORE_ID"),
        KV_REST_API_URL: Config.redacted("KV_REST_API_URL"),
        KV_REST_API_TOKEN: Config.redacted("KV_REST_API_TOKEN"),
      },
      sessionKVBindingName: false,
      prerenderEnvironment: "node" as const,
    }
  }),
)

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>

export default Alchemy.Stack(
  "EffectWebsite",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Website
    const pullRequest = yield* Config.option(Config.int("PULL_REQUEST"))

    yield* Option.match(pullRequest, {
      onNone: () => Effect.void,
      onSome: (issueNumber) =>
        Effect.gen(function* () {
          const sha = yield* Config.string("GITHUB_SHA")

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
      websiteUrl: website.url,
    }
  }),
)
