import * as Schema from "effect/Schema"

export const SearchVersion = Schema.Union([
  Schema.Literal("v3"),
  Schema.Literal("v4"),
])
export type SearchVersion = typeof SearchVersion.Type

export const RecentSearch = Schema.Struct({
  query: Schema.String,
  version: SearchVersion,
})
export type RecentSearch = typeof RecentSearch.Type

export const StoredRecentSearch = Schema.Union([Schema.String, RecentSearch])
export type StoredRecentSearch = typeof StoredRecentSearch.Type

export const RecentSearches = Schema.Array(StoredRecentSearch)

export function searchVersionFromPathname(pathname: string): SearchVersion {
  const [, section, version] = pathname.split("/")
  return section === "docs" && version === "v4" ? "v4" : "v3"
}

export function normalizeRecentSearch(
  search: StoredRecentSearch,
): RecentSearch {
  return typeof search === "string" ? { query: search, version: "v3" } : search
}

export function addRecentSearch(
  searches: ReadonlyArray<StoredRecentSearch>,
  search: RecentSearch,
): ReadonlyArray<RecentSearch> {
  const query = search.query.trim()
  const normalizedSearches = searches.map(normalizeRecentSearch)
  if (query.length === 0) return normalizedSearches

  const normalizedQuery = query.toLowerCase()
  return [
    { query, version: search.version },
    ...normalizedSearches.filter(
      (recentSearch) => recentSearch.query.toLowerCase() !== normalizedQuery,
    ),
  ].slice(0, 5)
}
