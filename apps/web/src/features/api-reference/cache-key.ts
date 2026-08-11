import type { CollectionEntry } from "astro:content"

export function packageNavigationCacheKeyParts(
  entries: ReadonlyArray<CollectionEntry<"apiReference">>,
) {
  return Array.from(Map.groupBy(entries, (entry) => entry.data.packageSlug))
    .flatMap(([, entries]) => {
      const entry = entries[0]
      return entry === undefined
        ? []
        : [[entry.data.packageSlug, entry.data.packageName] as const]
    })
    .toSorted(([left], [right]) => left.localeCompare(right))
}
