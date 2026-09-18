const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export function isSemver(value: string): boolean {
  return SEMVER.test(value.trim())
}

export interface ChangelogSection {
  readonly version: string
  readonly heading: string
  readonly body: Array<string>
}

// Split a changelog into per-version blocks. Keep only released-version
// (semver `##`) headings; ignore `##` inside fenced code. Non-semver headings
// stay inside the current block.
export function splitChangelogSections(
  source: string,
): Array<ChangelogSection> {
  const lines = source.split("\n")
  const sections: Array<ChangelogSection> = []
  let current:
    | { version: string; heading: string; body: Array<string> }
    | undefined
  let fenced = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
    }
    const heading = fenced ? null : /^##\s+(.+?)\s*$/.exec(line)
    const version = heading?.[1]?.trim()
    if (version !== undefined && isSemver(version)) {
      current = { version, heading: line, body: [] }
      sections.push(current)
    } else if (current !== undefined) {
      current.body.push(line)
    }
  }

  return sections
}
