import * as Schema from "effect/Schema"

export const IsoDate = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/),
)

export const ChangelogRelease = Schema.Struct({
  version: Schema.NonEmptyString,
  date: Schema.optional(IsoDate),
  breaking: Schema.Boolean,
  body: Schema.String,
})
export type ChangelogRelease = typeof ChangelogRelease.Type

/** The releases file; the package manifest holds everything else. */
export const ChangelogFile = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  releases: Schema.Array(ChangelogRelease),
})
export type ChangelogFile = typeof ChangelogFile.Type

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export const isSemver = (value: string): boolean => SEMVER.test(value)

const MAJOR_RELEASE = /^[1-9]\d*\.0\.0(?:\+|$)/

export interface ChangelogSection {
  readonly version: string
  readonly breaking: boolean
  readonly body: string
}

/**
 * Split a Changesets `CHANGELOG.md` into one section per `## <semver>` heading.
 * Headings inside fenced code are ignored. A release is breaking when it has a
 * `### Major Changes` block, or when it is a stable `X.0.0` major release with
 * history before it. Changesets lists only patch notes for a stable release cut
 * after a pre-release series (`effect@4.0.0`), so the heading alone misses it.
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

  return sections.map(({ version, breaking, lines }, index) => ({
    version,
    breaking:
      breaking || (MAJOR_RELEASE.test(version) && index < sections.length - 1),
    body: lines.join("\n").trim(),
  }))
}
