import * as Effect from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import type { Plugin } from "vite"
import { LatestRelease } from "./latest-release"

const moduleId = "virtual:latest-release"
const resolvedModuleId = `\0${moduleId}`

/**
 * Exposes the latest release of one package as a module, so the navbar renders
 * it at build time. A module, not a fetched file: Astro's incremental build
 * skips a page when its `cacheKey` and the hash of its module graph match the
 * last build, and the module graph is the one thing every page that renders the
 * navbar shares. A release then re-renders exactly those pages, and no page can
 * keep an old version.
 */
export const latestReleasePlugin = (
  runtime: ManagedRuntime.ManagedRuntime<LatestRelease, never>,
): Plugin => ({
  name: "latest-release",
  resolveId(id) {
    return id === moduleId ? resolvedModuleId : undefined
  },
  async load(id) {
    if (id !== resolvedModuleId) return undefined
    const { manifest, release } = await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* LatestRelease
        return { manifest: service.manifest, release: yield* service.latest() }
      }),
    )
    this.addWatchFile(manifest)
    return `export default ${JSON.stringify(release)}`
  },
})
