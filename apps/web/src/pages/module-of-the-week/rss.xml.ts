import type { APIContext } from "astro"
import rss from "@astrojs/rss"
import { getEntries } from "astro:content"
import { MODULE_FEED } from "@/features/module-of-the-week/domain"
import { getIntro, getLatestModules } from "@/features/module-of-the-week/http"

export async function GET(context: APIContext) {
  const [intro, modules] = await Promise.all([getIntro(), getLatestModules()])
  const posts = [...modules.map(({ post }) => post), ...(intro ? [intro] : [])]

  const items = await Promise.all(
    posts.map(async (post) => {
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
    title: MODULE_FEED.title,
    description:
      "A weekly look at the lesser-known parts of Effect, one module at a time",
    site: context.site!,
    items,
  })
}
