import * as Schema from "effect/Schema"
import { IsoDate } from "./Changelog.ts"

/**
 * Presentation helpers. They live apart from `Changelog.ts` on purpose: that
 * file feeds the API reference snapshot ID, and a UI edit must not republish
 * the snapshot.
 */

/** One package's changelog as the website lists it; releases load lazily. */
export const ChangelogEntry = Schema.Struct({
  channel: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  slug: Schema.NonEmptyString,
  packageVersion: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  sourceUrl: Schema.NonEmptyString,
  releaseCount: Schema.Int,
  latestDate: Schema.optional(IsoDate),
  // Releases file relative to the API reference directory, and its checksum.
  jsonPath: Schema.NonEmptyString,
  sha256: Schema.NonEmptyString,
})
export type ChangelogEntry = typeof ChangelogEntry.Type

export const changelogHref = (channel: string, slug: string): string =>
  `/docs/${channel}/api/${slug}/changelog`

export interface ReleaseGroup<A> {
  readonly key: string
  readonly label: string
  readonly releases: ReadonlyArray<A>
}

const PHASES: Readonly<Record<string, string>> = {
  alpha: "Alpha",
  beta: "Beta",
  rc: "RC",
  next: "Next",
  snapshot: "Snapshot",
}

/** Sidebar group of a release: its pre-release phase, else its `major.minor`. */
export function releaseGroup(version: string): {
  readonly key: string
  readonly label: string
} {
  const [precedence = version] = version.split("+", 1)
  const dash = precedence.indexOf("-")
  if (dash !== -1) {
    const phase =
      precedence
        .slice(dash + 1)
        .split(/[.-]/, 1)[0]
        ?.toLowerCase() ?? ""
    const label = PHASES[phase]
    return label === undefined
      ? { key: "prerelease", label: "Pre-release" }
      : { key: phase, label }
  }
  const [major, minor] = precedence.split(".")
  return { key: `${major}.${minor}`, label: `${major}.${minor}` }
}

/** Group releases by phase or `major.minor`, in order of first appearance. */
export function groupReleases<A extends { readonly version: string }>(
  releases: ReadonlyArray<A>,
): Array<ReleaseGroup<A>> {
  const groups = new Map<string, { label: string; releases: Array<A> }>()
  for (const release of releases) {
    const { key, label } = releaseGroup(release.version)
    const group = groups.get(key)
    if (group === undefined) groups.set(key, { label, releases: [release] })
    else group.releases.push(release)
  }
  return Array.from(groups, ([key, group]) => ({ key, ...group }))
}
