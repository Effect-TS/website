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

/** One summary per package changelog, without the release bodies. */
export async function loadChangelogSummaries(): Promise<
  ReadonlyArray<ChangelogSummary>
> {
  const [changelogs, modules] = await Promise.all([
    getCollection("changelog"),
    getCollection("apiReference"),
  ])
  const descriptions = new Map(
    modules.map(({ data }) => [
      `${data.version}/${data.packageSlug}`,
      data.packageDescription,
    ]),
  )
  return changelogs.map(({ data }) => ({
    channel: data.channel,
    description:
      descriptions.get(`${data.channel}/${data.slug}`) ??
      `Release notes for ${data.name}.`,
    latestDate: data.releases.find(
      (release) => release.version === data.packageVersion,
    )?.date,
    latestVersion: data.packageVersion,
    name: data.name,
    releaseCount: data.releases.length,
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
