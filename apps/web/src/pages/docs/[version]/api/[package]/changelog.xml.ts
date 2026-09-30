import type { APIContext, GetStaticPaths } from "astro"
import rss from "@astrojs/rss"
import { getCollection, render } from "astro:content"

import { isSemver } from "@website/domain/Changelog"

export const getStaticPaths = (async () => {
  const entries = await getCollection("changelog")
  return entries.map((entry) => {
    const [version, slug] = entry.id.split("/")
    return { params: { version: version!, package: slug! }, props: { entry } }
  })
}) satisfies GetStaticPaths

export async function GET(context: APIContext) {
  const { entry } = context.props as {
    entry: Awaited<ReturnType<typeof getCollection<"changelog">>>[number]
  }
  const { headings } = await render(entry)
  const anchors = new Map(
    headings
      .filter((heading) => heading.depth === 2 && isSemver(heading.text))
      .map((heading) => [heading.text, heading.slug]),
  )
  const pageHref = `/docs/${entry.data.channel}/api/${entry.data.slug}/changelog`

  const items = entry.data.versions
    .filter((version) => version.date !== undefined)
    .map((version) => {
      const anchor = anchors.get(version.version)
      return {
        title: `${entry.data.package}@${version.version}${version.breaking ? " (breaking)" : ""}`,
        pubDate: new Date(`${version.date}T00:00:00Z`),
        link: anchor === undefined ? pageHref : `${pageHref}#${anchor}`,
      }
    })

  return rss({
    title: `${entry.data.package} Changelog`,
    description: `Release changelog for ${entry.data.package}`,
    site: context.site!,
    items,
  })
}
