import type { PublishedRelease } from "./npm-registry"

export interface ReleaseSummary {
  readonly name: string
  readonly version: string
  readonly date?: string | undefined
}

interface Release {
  readonly version: string
  readonly date?: string | undefined
}

/** Orders `major.minor.patch[-pre]`; a prerelease sorts before its release. */
export const compareVersions = (a: string, b: string): number => {
  const [coreA = "", preA] = a.split(/[-+]/, 2)
  const [coreB = "", preB] = b.split(/[-+]/, 2)
  const partsA = coreA.split(".").map(Number)
  const partsB = coreB.split(".").map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff
  }
  if (preA === undefined || preB === undefined) {
    return preA === preB ? 0 : preA === undefined ? 1 : -1
  }
  return preA.localeCompare(preB, "en", { numeric: true })
}

/**
 * The release the navbar shows. With npm data it is the newest changelog
 * release that npm already serves, dated by npm. Without npm data it is the
 * version the API reference snapshot holds, dated by its tag.
 */
export const resolveLatestRelease = (input: {
  readonly name: string
  readonly snapshot: Release
  readonly releases: ReadonlyArray<Release>
  readonly npm: PublishedRelease | undefined
}): ReleaseSummary | null => {
  const { name, snapshot, releases, npm } = input
  if (npm === undefined) return { name, ...snapshot }
  const served = releases
    .filter(({ version }) => compareVersions(version, npm.latest) <= 0)
    .reduce<Release | undefined>(
      (best, release) =>
        best === undefined || compareVersions(release.version, best.version) > 0
          ? release
          : best,
      undefined,
    )
  if (served === undefined) return null
  return {
    name,
    version: served.version,
    date: npm.dates.get(served.version) ?? served.date,
  }
}
