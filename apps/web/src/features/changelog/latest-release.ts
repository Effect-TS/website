import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  loadChangelogReleases,
  readApiReferenceDataset,
} from "@website/api-reference/ApiReferenceDataset"
import * as Cache from "effect/Cache"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { NpmRegistry } from "./npm-registry"
import { resolveLatestRelease } from "./resolve-latest"

export class LatestReleaseError extends Data.TaggedError("LatestReleaseError")<{
  readonly cause: unknown
}> {}

export interface LatestReleaseOptions {
  /** Directory that holds one folder per API reference channel. */
  readonly base: URL
  readonly channel: string
  readonly slug: string
}

// The registry CDN caches its documents for 5 minutes.
const NPM_TTL = "5 minutes"

const read = <A>(try_: () => Promise<A>) =>
  Effect.tryPromise({
    try: try_,
    catch: (cause) => new LatestReleaseError({ cause }),
  })

/**
 * The latest release of one package: the newest changelog release that npm
 * already serves as `latest`, dated by npm. When npm is unreachable it is the
 * version and tag date in the package manifest, so npm never fails a build.
 */
export class LatestRelease extends Context.Service<LatestRelease>()(
  "app/LatestRelease",
  {
    make: Effect.fnUntraced(function* (options: LatestReleaseOptions) {
      const registry = yield* NpmRegistry
      const base = fileURLToPath(options.base)

      // A failed lookup expires at once, so the next read asks npm again.
      const published = yield* Cache.makeWith(registry.published, {
        capacity: 1,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? NPM_TTL : 0),
      })

      const latest = Effect.fn("LatestRelease.latest")(function* () {
        const { packages } = yield* read(() => readApiReferenceDataset(base))
        const pkg = packages.find(
          ({ channel, slug, changelog }) =>
            channel === options.channel &&
            slug === options.slug &&
            changelog !== undefined,
        )
        const changelog = pkg?.changelog
        if (pkg === undefined || changelog === undefined) return null

        const npm = yield* Cache.get(published, pkg.name).pipe(
          Effect.catchTag("NpmRegistryError", (error) =>
            Effect.logWarning(
              `npm unavailable, showing the API reference version: ${String(error.cause)}`,
            ).pipe(Effect.as(undefined)),
          ),
        )
        const releases =
          npm === undefined
            ? []
            : yield* read(() =>
                loadChangelogReleases(
                  { jsonPath: changelog.path, sha256: changelog.sha256 },
                  { baseDirectory: base },
                ),
              )
        return resolveLatestRelease({
          name: pkg.name,
          snapshot: { version: pkg.version, date: changelog.latestDate },
          releases,
          npm,
        })
      })

      return {
        latest,
        /** The generator writes the dataset manifest last. */
        manifest: join(base, options.channel, "manifest.json"),
      } as const
    }),
  },
) {
  static readonly layerNoDeps = (options: LatestReleaseOptions) =>
    Layer.effect(this, this.make(options))
  static readonly layer = (options: LatestReleaseOptions) =>
    this.layerNoDeps(options).pipe(Layer.provide(NpmRegistry.layer))
}
