import type {
  SearchFilter,
  SearchFilterCondition,
} from "@mixedbread/sdk/resources/shared"
import { DOCS_VERSIONS, type DocsVersion } from "@/lib/versions"
import { SEARCH_GROUPS, type SearchGroup } from "./domain"

/** The only version with indexed changelogs. */
export const CHANGELOG_VERSION: DocsVersion = "v4"

export type Filter = SearchFilter | SearchFilterCondition

const eq = (key: string, value: string): SearchFilterCondition => ({
  key,
  operator: "eq",
  value,
})

const groupFilter = (
  group: SearchGroup,
  version: DocsVersion | undefined,
  packageSlug: string | undefined,
): Filter | undefined => {
  switch (group) {
    case "documentation": {
      const documentation = eq("content_source", "documentation")
      return version === undefined
        ? documentation
        : { all: [documentation, eq("docs_version", version)] }
    }
    case "api-reference": {
      return version === undefined
        ? eq("content_source", "api-reference")
        : eq("api_version", version)
    }
    case "blog": {
      // Posts without a version stay visible in both.
      const blog = eq("content_source", "blog")
      return version === undefined
        ? blog
        : {
            all: [
              blog,
              {
                none: DOCS_VERSIONS.filter(
                  (other) => other.value !== version,
                ).map((other) => eq("docs_version", other.value)),
              },
            ],
          }
    }
    case "changelog": {
      if (version !== undefined && version !== CHANGELOG_VERSION) {
        return undefined
      }
      const changelog = eq("content_source", "changelog")
      return packageSlug === undefined
        ? changelog
        : { all: [changelog, eq("package_slug", packageSlug)] }
    }
  }
}

/**
 * Filter that limits a search to the chosen result groups and docs version.
 * No groups means every group. `undefined` means an unfiltered search, and
 * `null` means nothing can match, so the search must not run.
 */
export function searchFilter(options: {
  readonly version?: DocsVersion | undefined
  readonly groups?: ReadonlyArray<SearchGroup> | undefined
  readonly packageSlug?: string | undefined
}): Filter | undefined | null {
  const { groups, packageSlug, version } = options
  const chosen =
    packageSlug !== undefined
      ? (["changelog"] as const)
      : groups === undefined || groups.length === 0
        ? SEARCH_GROUPS
        : SEARCH_GROUPS.filter((group) => groups.includes(group))
  const filters = chosen.flatMap((group) => {
    const filter = groupFilter(group, version, packageSlug)
    return filter === undefined ? [] : [filter]
  })

  if (filters.length === 0) return null
  if (version === undefined && filters.length === SEARCH_GROUPS.length) {
    return undefined
  }
  const [first] = filters
  return filters.length === 1 && first !== undefined ? first : { any: filters }
}
