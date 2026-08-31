import type { CollectionEntry } from "astro:content"

import { digest, sortedRows } from "@/lib/cache-key"

/**
 * Cache-key digests for the API reference routes.
 *
 * These pages are prerendered from `getStaticPaths()` like any other route, but
 * their data does not come from `src/content/`. It comes from the gitignored
 * TypeDoc dataset under `apps/web/.data/api-reference/`, and the pages never
 * call `render()` — so Astro's automatic content-entry hash tracking does not
 * protect them. The `cacheKey` is the only thing standing between a changed
 * dataset and stale HTML.
 *
 * Keying on the entry alone would be wrong: each module page also renders a
 * package-scoped sidebar, a version-wide package switcher, version-wide
 * `module:Foo` link resolution, and a v3/v4 version switcher. The digests below
 * cover each of those, and are derived from *metadata only* — which packages
 * and modules exist and where their sources live. That set barely moves between
 * Effect commits, while `reflectionDigest` moves only for modules whose docs
 * actually changed, which is what produces a useful hit rate.
 *
 * Note that `entry.digest` is deliberately unused here: the loader mixes the
 * global Effect revision into it, so it changes on every snapshot. Key on
 * `entry.data.reflectionDigest` — the per-module SHA-256 from the package
 * manifest — instead.
 */

type Entry = CollectionEntry<"apiReference">

export interface ApiReferenceDigests {
  /**
   * Per version. Covers `createReflectionSymbolResolver` (which consumes
   * exactly `packageName`, `sourcePath`, `packageSlug`, `modulePath` and
   * `version`) and the mobile package switcher.
   */
  readonly symbolIndex: ReadonlyMap<string, string>
  /**
   * Per `${version}/${packageSlug}`. Covers the sidebar tree, the mobile module
   * list, and the package metadata a module page renders.
   */
  readonly packageIndex: ReadonlyMap<string, string>
  /** Covers the v3/v4 version switcher, which looks across both versions. */
  readonly crossVersion: string
}

export const packageIndexKey = (version: string, packageSlug: string): string =>
  `${version}/${packageSlug}`

export function apiReferenceDigests(
  entries: ReadonlyArray<Entry>,
): ApiReferenceDigests {
  const symbolIndex = new Map<string, string>()
  const packageIndex = new Map<string, string>()

  for (const [version, versionEntries] of Map.groupBy(
    entries,
    (entry) => entry.data.version,
  )) {
    symbolIndex.set(
      version,
      digest(
        sortedRows(
          versionEntries.map(({ data }) => [
            data.packageName,
            data.sourcePath,
            data.packageSlug,
            data.modulePath,
          ]),
        ),
      ),
    )

    for (const [packageSlug, packageEntries] of Map.groupBy(
      versionEntries,
      (entry) => entry.data.packageSlug,
    )) {
      const first = packageEntries[0]?.data
      packageIndex.set(
        packageIndexKey(version, packageSlug),
        digest({
          modules: sortedRows(
            packageEntries.map(({ data }) => data.modulePath),
          ),
          pkg: [
            first?.packageName,
            first?.packageSlug,
            first?.packageSourceUrl,
          ],
        }),
      )
    }
  }

  return {
    symbolIndex,
    packageIndex,
    crossVersion: digest(
      sortedRows(
        entries.map(
          ({ data }) =>
            `${data.version}/${data.packageSlug}/${data.modulePath}`,
        ),
      ),
    ),
  }
}

/**
 * Digest of everything a package landing page renders about its package, beyond
 * the module list already covered by `packageIndex`.
 */
export const packageMetadataDigest = (entry: Entry["data"]): string =>
  digest([
    entry.packageVersion,
    entry.packageDescription,
    entry.packageNpmUrl,
    entry.packageSourceUrl,
    entry.packageModuleCount,
  ])

/** Digest of everything a version landing page renders about its packages. */
export const versionIndexDigest = (
  entries: ReadonlyArray<Entry>,
  version: string,
): string =>
  digest(
    sortedRows(
      entries
        .filter((entry) => entry.data.version === version)
        .map(({ data }) => [
          data.packageSlug,
          data.packageName,
          data.packageDescription,
          data.packageVersion,
          data.packageModuleCount,
        ]),
    ),
  )
