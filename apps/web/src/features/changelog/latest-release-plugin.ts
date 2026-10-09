import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { readApiReferenceDataset } from "@website/api-reference/ApiReferenceDataset"
import type { Plugin } from "vite"

const moduleId = "virtual:latest-release"
const resolvedModuleId = `\0${moduleId}`

export interface LatestReleasePluginOptions {
  /** Directory that holds one folder per API reference channel. */
  readonly base: URL
  readonly channel: string
  readonly slug: string
}

/**
 * Exposes the latest release of one package as a module, so the navbar renders
 * it at build time. A module, not a fetched file: Astro's incremental build
 * skips a page when its `cacheKey` and the hash of its module graph match the
 * last build, and the module graph is the one thing every page that renders the
 * navbar shares. A release then re-renders exactly those pages, and no page can
 * keep an old version.
 *
 * The version is the one the API reference shows for the package, because both
 * come from the same package manifest.
 */
export const latestReleasePlugin = (
  options: LatestReleasePluginOptions,
): Plugin => ({
  name: "latest-release",
  resolveId(id) {
    return id === moduleId ? resolvedModuleId : undefined
  },
  async load(id) {
    if (id !== resolvedModuleId) return undefined
    const base = fileURLToPath(options.base)
    // The generator writes the dataset manifest last.
    this.addWatchFile(join(base, options.channel, "manifest.json"))
    const { packages } = await readApiReferenceDataset(base)
    const pkg = packages.find(
      ({ channel, slug, changelog }) =>
        channel === options.channel &&
        slug === options.slug &&
        changelog !== undefined,
    )
    const release =
      pkg === undefined
        ? null
        : {
            name: pkg.name,
            version: pkg.version,
            date: pkg.changelog?.latestDate,
          }
    return `export default ${JSON.stringify(release)}`
  },
})
