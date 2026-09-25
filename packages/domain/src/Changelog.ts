const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export function isSemver(value: string): boolean {
  return SEMVER.test(value.trim())
}

export interface ChangelogSection {
  readonly version: string
  readonly heading: string
  readonly body: Array<string>
  // A Changesets `### Major Changes` block marks a breaking release.
  readonly breaking: boolean
}

// Split a changelog into per-version blocks. Keep only released-version
// (semver `##`) headings; ignore `##` inside fenced code. Non-semver headings
// stay inside the current block.
export function splitChangelogSections(
  source: string,
): Array<ChangelogSection> {
  const lines = source.split("\n")
  // Mutable while building; returned as readonly ChangelogSection[].
  type MutableSection = {
    version: string
    heading: string
    body: Array<string>
    breaking: boolean
  }
  const sections: Array<MutableSection> = []
  let fenced = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
    }
    const heading = fenced ? null : /^##\s+(.+?)\s*$/.exec(line)
    const version = heading?.[1]?.trim()
    if (version !== undefined && isSemver(version)) {
      sections.push({ version, heading: line, body: [], breaking: false })
      continue
    }
    const current = sections.at(-1)
    if (current === undefined) continue
    if (!fenced && /^###\s+Major Changes\s*$/.test(line)) {
      current.breaking = true
    }
    current.body.push(line)
  }

  return sections
}
