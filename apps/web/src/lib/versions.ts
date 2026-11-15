import * as Schema from "effect/Schema"

export const DOCS_VERSIONS = [
  { value: "v4", label: "v4" },
  { value: "v3", label: "v3" },
] as const

export type DocsVersion = typeof DocsVersion.Encoded

export const DocsVersion = Schema.Literals(
  DOCS_VERSIONS.map(({ value }) => value),
)

export const defaultDocsVersion: DocsVersion = "v4"

export const isDocsVersion = Schema.is(DocsVersion)

export function docsVersionFromPathname(pathname: string): DocsVersion {
  const [, section, version] = pathname.split("/")
  return section === "docs" && isDocsVersion(version)
    ? version
    : defaultDocsVersion
}

export interface DocsVersionLink {
  readonly version: DocsVersion
  readonly label: string
  readonly href: string
  readonly current: boolean
}

/**
 * The version menu's entries for a docs page. `hrefFor` returns where a
 * version's entry leads: the same page in that version when it exists there,
 * otherwise that version's docs or API reference home.
 */
export const docsVersionLinks = (
  current: string,
  hrefFor: (version: DocsVersion) => string,
): ReadonlyArray<DocsVersionLink> =>
  DOCS_VERSIONS.map(({ value, label }) => ({
    version: value,
    label,
    href: hrefFor(value),
    current: value === current,
  }))
