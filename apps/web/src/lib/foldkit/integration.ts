import type { AstroIntegration } from "astro"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import { foldkitDevDependencies } from "./dev-dependencies"
import { foldkitBuildId } from "./build-id"
import { foldkitPlugins } from "./plugins"

const TOOLBAR_ICON =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M10 2 2.5 6 10 10l7.5-4L10 2Z"/><path d="m2.5 10 7.5 4 7.5-4"/><path d="m2.5 14 7.5 4 7.5-4"/></svg>'

const entrypoint = (file: string) =>
  fileURLToPath(new URL(file, import.meta.url))

export interface FoldkitOptions {
  /**
   * Names this build. It must change whenever the HTML Foldkit renders can
   * differ from what the client bundle expects, and it ships in every page.
   * Defaults to `FOLDKIT_BUILD_ID`, then to a new id per process.
   */
  readonly buildId?: string | undefined
  /**
   * Browser dependencies the dev server must pre-bundle at start. List the ones
   * the first page does not import, or Vite finds them late, re-optimizes, and
   * answers requests for already served modules with `504 Outdated Optimize Dep`.
   */
  readonly preBundle?: ReadonlyArray<string> | undefined
}

/**
 * Renders Foldkit applications on the server and hydrates them in the browser
 * through a `foldkit` renderer: `<App client:load />` for an `App` made with
 * `defineApplication`.
 *
 * From `@foldkit/vite-plugin` it uses the view-identity transform and the dev
 * Model preservation, and leaves out what would break React Fast Refresh and
 * CSS HMR for the rest of the site. See `plugins.ts`.
 */
export const foldkit = (options: FoldkitOptions = {}): AstroIntegration => {
  const buildId =
    options.buildId || process.env["FOLDKIT_BUILD_ID"] || randomUUID()
  return {
    name: "foldkit",
    hooks: {
      "astro:config:setup": ({
        addDevToolbarApp,
        addRenderer,
        command,
        updateConfig,
      }) => {
        if (command === "dev") {
          addDevToolbarApp({
            id: "foldkit",
            name: "Foldkit",
            icon: TOOLBAR_ICON,
            entrypoint: entrypoint("./devtools-toolbar-app.ts"),
          })
        }
        addRenderer({
          name: "foldkit",
          clientEntrypoint: entrypoint("./client.ts"),
          serverEntrypoint: entrypoint("./server.ts"),
        })
        updateConfig({
          vite: {
            plugins: [
              foldkitDevDependencies(options.preBundle ?? []),
              foldkitBuildId(buildId),
              ...foldkitPlugins(),
            ],
          },
        })
      },
    },
  }
}
