import * as Schema from "effect/Schema"

export const DOCS_VERSIONS = [
  { value: "v4", label: "v4 (rc)" },
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
