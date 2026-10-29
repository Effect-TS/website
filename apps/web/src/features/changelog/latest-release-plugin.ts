import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  loadChangelogReleases,
  readApiReferenceDataset,
} from "@website/api-reference/ApiReferenceDataset"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Plugin } from "vite"
import { NpmRegistry, type PublishedRelease } from "./npm-registry"
import { resolveLatestRelease } from "./resolve-latest"

const moduleId = "virtual:latest-release"
const resolvedModuleId = `\0${moduleId}`

// The registry CDN caches its documents for 5 minutes.
const NPM_TTL_MS = 5 * 60 * 1000

export interface LatestReleasePluginOptions {
  /** Directory that holds one folder per API reference channel. */
  readonly base: URL
  readonly channel: string
  readonly slug: string
  /**
   * Where npm data comes from. Without it the module shows the version of the
   * API reference snapshot, which can be ahead of npm.
   */
  readonly registry?: Layer.Layer<NpmRegistry> | undefined
}

/**
 * Exposes the latest release of one package as a module, so the navbar renders
 * it at build time. A module, not a fetched file: Astro's incremental build
 * skips a page when its `cacheKey` and the hash of its module graph match the
 * last build, and the module graph is the one thing every page that renders the
 * navbar shares. A release then re-renders exactly those pages, and no page can
 * keep an old version.
 *
 * The version is the newest one in the package changelog that npm already
 * serves as `latest`, dated by npm. When npm is unreachable the module falls
 * back to the version and tag date in the package manifest, so npm never fails
 * a build.
 */
export const latestReleasePlugin = (
  options: LatestReleasePluginOptions,
): Plugin => {
  const runtime =
    options.registry === undefined
      ? undefined
      : ManagedRuntime.make(options.registry)
  let npm:
    | {
        readonly at: number
        readonly value: Promise<PublishedRelease | undefined>
      }
    | undefined

  const fetchNpm = (name: string) => {
    if (runtime === undefined) return Promise.resolve(undefined)
    if (npm === undefined || Date.now() - npm.at > NPM_TTL_MS) {
      npm = {
        at: Date.now(),
        value: runtime.runPromise(
          Effect.gen(function* () {
            const registry = yield* NpmRegistry
            return yield* registry.published(name)
          }).pipe(
            Effect.catchTag("NpmRegistryError", (error) =>
              Effect.logWarning(
                `npm unavailable, showing the API reference version: ${String(error.cause)}`,
              ).pipe(Effect.as(undefined)),
            ),
          ),
        ),
      }
    }
    return npm.value
  }

  return {
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
      const changelog = pkg?.changelog
      if (pkg === undefined || changelog === undefined) {
        return "export default null"
      }
      const published = await fetchNpm(pkg.name)
      const release = resolveLatestRelease({
        name: pkg.name,
        snapshot: { version: pkg.version, date: changelog.latestDate },
        releases:
          published === undefined
            ? []
            : await loadChangelogReleases(
                { jsonPath: changelog.path, sha256: changelog.sha256 },
                { baseDirectory: base },
              ),
        npm: published,
      })
      return `export default ${JSON.stringify(release)}`
    },
  }
}
