import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectPodcastPlugin(): StarlightPlugin {
  return {
    name: "starlight-effect-podcast-plugin",
    hooks: {
      'config:setup'({ addIntegration, addRouteMiddleware, astroConfig, }) {
        addRouteMiddleware({
          entrypoint: "./src/plugins/starlight/podcast/middleware.ts"
        })

        addIntegration({
          name: "starlight-effect-podcast-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint:
                  "./src/routes/podcast/Podcast.astro",
                pattern: "/[...prefix]",
                prerender: true
              })

              if (astroConfig.site) {
                injectRoute({
                  entrypoint:
                    "./src/routes/podcast/rss.xml.ts",
                  pattern: "/[...prefix]/rss.xml",
                  prerender: true
                })
              }
            }
          }
        })
      }
    }
  }
}
