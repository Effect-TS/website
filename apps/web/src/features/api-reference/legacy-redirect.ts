import { isDocsVersion } from "@/lib/versions"

export function legacyApiRedirect(pathname: string): string | undefined {
  const [, docs, api, version, ...rest] = pathname.split("/")
  if (docs !== "docs" || api !== "api" || !isDocsVersion(version)) {
    return undefined
  }
  const suffix = rest.length === 0 ? "" : `/${rest.join("/")}`
  return `/docs/${version}/api${suffix}`
}
