import * as Schema from "effect/Schema"

const Channel = Schema.String.check(Schema.isPattern(/^v\d+$/))
const IsoDate = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))

export const ChangelogRelease = Schema.Struct({
  version: Schema.NonEmptyString,
  date: Schema.optional(IsoDate),
  breaking: Schema.Boolean,
  body: Schema.String,
})
export type ChangelogRelease = typeof ChangelogRelease.Type

export const ChangelogPackage = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  channel: Channel,
  name: Schema.NonEmptyString,
  slug: Schema.NonEmptyString,
  packageVersion: Schema.NonEmptyString,
  // Effect revision it was generated from; must match the API reference's.
  revision: Schema.NonEmptyString,
  sourceUrl: Schema.NonEmptyString,
  releases: Schema.Array(ChangelogRelease),
})
export type ChangelogPackage = typeof ChangelogPackage.Type

export interface LatestRelease {
  readonly name: string
  readonly version: string
  readonly date: string | undefined
}

/**
 * The release the package manifest names, so a page showing it agrees with the
 * API reference built from the same revision.
 */
export const latestRelease = (changelog: ChangelogPackage): LatestRelease => ({
  name: changelog.name,
  version: changelog.packageVersion,
  date: changelog.releases.find(
    (release) => release.version === changelog.packageVersion,
  )?.date,
})

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export const isSemver = (value: string): boolean => SEMVER.test(value)

export interface ChangelogSection {
  readonly version: string
  readonly breaking: boolean
  readonly body: string
}

/**
 * Split a Changesets `CHANGELOG.md` into one section per `## <semver>` heading.
 * Headings inside fenced code are ignored. A `### Major Changes` block marks a
 * release as breaking.
 */
export function splitChangelog(source: string): Array<ChangelogSection> {
  const sections: Array<{
    version: string
    breaking: boolean
    lines: Array<string>
  }> = []
  let fenced = false

  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced
    const version = fenced ? undefined : /^##\s+(\S+)\s*$/.exec(line)?.[1]
    if (version !== undefined && isSemver(version)) {
      sections.push({ version, breaking: false, lines: [] })
      continue
    }
    const current = sections.at(-1)
    if (current === undefined) continue
    if (!fenced && /^###\s+Major Changes\s*$/.test(line))
      current.breaking = true
    current.lines.push(line)
  }

  return sections.map(({ version, breaking, lines }) => ({
    version,
    breaking,
    body: lines.join("\n").trim(),
  }))
}

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
