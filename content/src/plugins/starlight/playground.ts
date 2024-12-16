import type { StarlightPlugin } from "@astrojs/starlight/types"

export function effectPlaygroundPlugin({ pattern }: {
  readonly pattern: string
}): StarlightPlugin {
  return {
    name: "starlight-effect-playground-plugin",
    hooks: {
      setup({
        addIntegration
      }) {
        addIntegration({
          name: "effect-playground-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute }) => {
              injectRoute({
                entrypoint: "./src/components/plugins/playground/Playground.astro",
                pattern,
                prerender: false
              })
            }
          }
        })

      }
    }
  }
}
