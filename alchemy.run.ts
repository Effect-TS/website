import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

export default Alchemy.Stack(
  "EffectWebsite",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Cloudflare.Website.Astro("WebsiteWorker", {
      rootDir: "./apps/web",
      sessionKVBindingName: false,
      prerenderEnvironment: "node",
    })

    return {
      websiteUrl: website.url,
    }
  }),
)
