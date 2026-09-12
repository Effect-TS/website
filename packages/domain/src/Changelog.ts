const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export function isSemver(value: string): boolean {
  return SEMVER.test(value.trim())
}

// Mirrors github-slugger (used by rehypeHeadingIds) for the semver headings we
// emit, so cached sidebar anchors match the ids rehype assigns at render time.
export function changelogSlug(version: string): string {
  return version
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}
