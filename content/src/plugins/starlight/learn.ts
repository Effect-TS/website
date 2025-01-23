import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectLearnPlugin(): StarlightPlugin {
  return {
    name: "starlight-effect-learn-plugin",
    hooks: {
      setup({ addIntegration }) {
        addIntegration({
          name: "effect-learn-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint:
                  "./src/components/plugins/learn/Tutorial.astro",
                pattern: "/[...prefix]/tutorials/[...tutorial]",
                prerender: true
              })
            }
          }
        })
      }
    }
  }
}
