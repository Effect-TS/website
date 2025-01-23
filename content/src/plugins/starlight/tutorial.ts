import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectPodcastPlugin(): StarlightPlugin {
  return {
    name: "starlight-effect-tutorial-plugin",
    hooks: {
      setup({ addIntegration }) {
        addIntegration({
          name: "effect-tutorial-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint:
                  "./src/components/plugins/tutorial/Tutorial.astro",
                pattern: "/tutorials/[...tutorial]",
                prerender: true
              })
            }
          }
        })
      }
    }
  }
}
