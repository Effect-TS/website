import rss from "@astrojs/rss"
import type { APIContext, GetStaticPaths } from "astro"
import { getCollection, type CollectionEntry } from "astro:content"
import { renderChangelogHtml } from "@website/api-reference/ChangelogHtml"
import { changelogHref } from "@website/domain/ChangelogView"

import { changelogDigest } from "@/features/changelog/cache-key"
import { loadReleases } from "@/features/changelog/releases"

const FEED_LENGTH = 50

export const prerender = true

export const getStaticPaths = (async () => {
  const entries = await getCollection("changelog")
  return entries.map((entry) => ({
    params: { version: entry.data.channel, package: entry.data.slug },
    cacheKey: changelogDigest(entry.data),
    props: { entry },
  }))
}) satisfies GetStaticPaths

export async function GET(
  context: APIContext<{ entry: CollectionEntry<"changelog"> }>,
) {
  const { data } = context.props.entry
  const { channel, name, slug } = data
  const releases = await loadReleases(data)
  const items = releases
    .flatMap((release) =>
      release.date === undefined
        ? []
        : [{ release, pubDate: new Date(`${release.date}T00:00:00Z`) }],
    )
    .toSorted((left, right) => right.pubDate.getTime() - left.pubDate.getTime())
    .slice(0, FEED_LENGTH)
    .map(({ release, pubDate }) => ({
      title: `${name} ${release.version}`,
      description: release.breaking
        ? `Breaking release of ${name}.`
        : `Release notes for ${name} ${release.version}.`,
      content: renderChangelogHtml(release.body),
      link: `${changelogHref(channel, slug)}#${release.version}`,
      pubDate,
    }))

  return rss({
    title: `${name} changelog`,
    description: `Release notes for ${name} (Effect ${channel}).`,
    site: context.site!,
    items,
  })
}
