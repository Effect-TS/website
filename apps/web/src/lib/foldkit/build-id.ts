import type { Plugin } from "vite"

const MODULE_ID = "virtual:foldkit/build-id"
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`

/**
 * Serves one build id to every Vite environment of this process, so the HTML
 * the server stamps and the client bundle that hydrates it agree. Foldkit
 * refuses to hydrate a page whose id differs from the client's own.
 */
export const foldkitBuildId = (buildId: string): Plugin => ({
  name: "foldkit:build-id",
  resolveId: (id) => (id === MODULE_ID ? RESOLVED_MODULE_ID : undefined),
  load: (id) =>
    id === RESOLVED_MODULE_ID
      ? `export default ${JSON.stringify(buildId)}`
      : undefined,
})
