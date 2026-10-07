import { getCollection } from "astro:content"

import { digest } from "@/lib/cache-key"

export interface ChangelogSummary {
  readonly channel: string
  readonly description: string
  readonly latestDate: string | undefined
  readonly latestVersion: string
  readonly name: string
  readonly releaseCount: number
  readonly slug: string
}

/** One summary per package changelog, without the releases. */
export async function loadChangelogSummaries(): Promise<
  ReadonlyArray<ChangelogSummary>
> {
  return (await getCollection("changelog")).map(({ data }) => ({
    channel: data.channel,
    description: data.description,
    latestDate: data.latestDate,
    latestVersion: data.packageVersion,
    name: data.name,
    releaseCount: data.releaseCount,
    slug: data.slug,
  }))
}

/** Digest of everything the changelog index pages render. */
export const summariesDigest = (
  summaries: ReadonlyArray<ChangelogSummary>,
): string =>
  digest(
    summaries
      .map((summary) => JSON.stringify(summary))
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
  )
