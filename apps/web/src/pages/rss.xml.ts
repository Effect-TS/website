import type { APIContext } from "astro"
import rss from "@astrojs/rss"
import { getCollection, getEntries } from "astro:content"

export async function GET(context: APIContext) {
  const posts = await getCollection("blog")
  const sorted = posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  )

  const items = await Promise.all(
    sorted.map(async (post) => {
      const authors = await getEntries(post.data.authors)
      return {
        title: post.data.title,
        description: post.data.excerpt,
        pubDate: post.data.date,
        link: `/blog/${post.id}/`,
        customData: `<author>${authors.map((a) => a.data.name).join(", ")}</author>`,
      }
    }),
  )

  return rss({
    title: "Effect Blog",
    description: "Releases, write-ups, and notes from the Effect team",
    site: context.site!,
    items,
  })
}
