import * as Schema from "effect/Schema"
import { DocsVersion } from "@/lib/versions"

export const RecentSearch = Schema.Struct({
  query: Schema.String,
  version: DocsVersion,
})
export type RecentSearch = typeof RecentSearch.Type

export const StoredRecentSearch = Schema.Union([Schema.String, RecentSearch])
export type StoredRecentSearch = typeof StoredRecentSearch.Type

export const RecentSearches = Schema.Array(StoredRecentSearch)

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
