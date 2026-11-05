import * as Schema from "effect/Schema"
import { DOCS_VERSIONS, defaultDocsVersion } from "@/lib/docs-versions"

export { DOCS_VERSIONS, defaultDocsVersion }

export type DocsVersion = typeof DocsVersion.Encoded

export const DocsVersion = Schema.Literals(
  DOCS_VERSIONS.map(({ value }) => value),
)

export const isDocsVersion = Schema.is(DocsVersion)

export function docsVersionFromPathname(pathname: string): DocsVersion {
  const [, section, version] = pathname.split("/")
  return section === "docs" && isDocsVersion(version)
    ? version
    : defaultDocsVersion
}
