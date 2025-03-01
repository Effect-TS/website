import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectPodcastPlugin(): StarlightPlugin {
  return {
    name: "starlight-effect-podcast-plugin",
    hooks: {
      setup({ addIntegration, astroConfig }) {
        addIntegration({
          name: "effect-podcast-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint:
                  "./src/components/plugins/podcast/Podcast.astro",
                pattern: "/[...prefix]",
                prerender: true
              })

              injectRoute({
                entrypoint:
                  "./src/components/plugins/podcast/Episode.astro",
                pattern: "/[...prefix]/episodes/[...episode]",
                prerender: true
              })

              if (astroConfig.site) {
                injectRoute({
                  entrypoint:
                    "./src/components/plugins/podcast/rss.xml.ts",
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
