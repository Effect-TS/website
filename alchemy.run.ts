import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

export const Website = Cloudflare.Website.Astro("WebsiteWorker", {
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
    workspaces: "auto",
  },
  astro: { output: "static" },
  sessionKVBindingName: false,
  prerenderEnvironment: "node",
})

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>

export default Alchemy.Stack(
  "EffectWebsite",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Website

    return {
      websiteUrl: website.url,
    }
  }),
)
