import type { CollectionEntry } from "astro:content"

import { digest, sortedRows } from "@/lib/cache-key"

/**
 * Cache-key digests for the changelog routes. Like the API reference pages,
 * these never call `render()`, so the `cacheKey` is the only guard against
 * stale HTML.
 */
type Entry = CollectionEntry<"changelog">

/** Everything a changelog page and feed render about their own package. */
export const changelogDigest = (entry: Entry["data"]): string =>
  digest([entry.name, entry.packageVersion, entry.sourceUrl, entry.releases])

/** Which packages and channels the mobile switchers list. */
export const changelogIndexDigest = (entries: ReadonlyArray<Entry>): string =>
  digest(
    sortedRows(entries.map(({ data }) => [data.channel, data.slug, data.name])),
  )
