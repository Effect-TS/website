import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectPodcastPlugin(): StarlightPlugin {
  return {
    name: "starlight-effect-podcast-plugin",
    hooks: {
      'config:setup'({ addIntegration, addRouteMiddleware, astroConfig }) {
        addRouteMiddleware({ entrypoint: "./src/plugins/starlight/podcast/middleware.ts" })

        addIntegration({
          name: "effect-playground-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint:
                  "./src/routes/podcast/Podcast.astro",
                pattern: "/[...prefix]",
                prerender: true
              })

              injectRoute({
                entrypoint:
                  "./src/routes/podcast/PodcastEpisode.astro",
                pattern: "/[...prefix]/episodes/[...episode]",
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
