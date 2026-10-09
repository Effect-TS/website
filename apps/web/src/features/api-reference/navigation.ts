import { DOCS_VERSIONS } from "@/lib/versions"

/** `@effect/sql-pg` -> `sql-pg`, the way the API reference labels packages. */
export const packageDisplayName = (name: string): string =>
  name.replace("@effect/", "")

/**
 * Options for the mobile version switch: one per docs version that has a page
 * to go to. `hrefFor` returns undefined for a version without one.
 */
export function versionLinks(
  current: string,
  hrefFor: (version: string) => string | undefined,
) {
  return DOCS_VERSIONS.flatMap(({ value, label }) => {
    const href = hrefFor(value)
    return href === undefined
      ? []
      : [{ href, label, selected: value === current }]
  })
}
