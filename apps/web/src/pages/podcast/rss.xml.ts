import type { APIContext } from "astro"
import rss from "@astrojs/rss"
import { getCollection } from "astro:content"

export async function GET(context: APIContext) {
  const episodes = await getCollection("podcasts")
  const sorted = episodes.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  )

  return rss({
    title: "Cause & Effect Podcast",
    description:
      "Exploring how engineers are using Effect to build reliable, production-grade software in TypeScript",
    site: context.site!,
    items: sorted.map((episode) => ({
      title: episode.data.title,
      description: episode.data.description,
      pubDate: new Date(episode.data.date),
      link: `/podcast/episodes/${episode.id}/`,
      enclosure: {
        url: episode.data.enclosure.url,
        length: episode.data.enclosure.length,
        type: episode.data.enclosure.type,
      },
      customData: `<itunes:duration>${episode.data.duration}</itunes:duration>`,
    })),
    xmlns: { itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd" },
    customData: `<language>en-us</language>`,
  })
}
