import type { AstroIntegration } from "astro"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import { foldkitBundled, foldkitDevDependencies } from "./dev-dependencies"
import { foldkitBuildId } from "./build-id"
import { foldkitPlugins } from "./plugins"

const TOOLBAR_ICON =
  '<svg viewBox="41.25 41.25 97.5 97.5" fill="currentColor"><rect x="41.25" y="41.25" width="45" height="97.5"/><rect x="93.75" y="41.25" width="45" height="18.75"/><rect x="93.75" y="67.5" width="45" height="18.75"/></svg>'

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
 * Renders Foldkit Programs on the server and hydrates them in the browser
 * through a `foldkit` renderer: `<Program client:load />` for a Program made with
 * `defineProgram`.
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
            ssr: {
              noExternal: ["foldkit", "@foldkit/ui", "@foldkit/devtools"],
            },
            plugins: [
              foldkitDevDependencies(options.preBundle ?? []),
              foldkitBundled(),
              foldkitBuildId(buildId),
              ...foldkitPlugins(),
            ],
          },
        })
      },
    },
  }
}
