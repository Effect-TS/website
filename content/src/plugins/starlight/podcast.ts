import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectPodcastPlugin(): StarlightPlugin {
  return {
    name: "starlight-effect-podcast-plugin",
    hooks: {
      setup({
        addIntegration
      }) {
        addIntegration({
          name: "effect-playground-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint: "./src/components/plugins/podcast/Podcasts.astro",
                pattern: "/[...prefix]",
                prerender: true
              })

              injectRoute({
                entrypoint: "./src/components/plugins/podcast/Podcast.astro",
                pattern: "/[...prefix]/[...episode]",
                prerender: true
              })
            }
          }
        })

      }
    }
  }
}
