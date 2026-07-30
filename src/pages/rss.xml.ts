import type { APIContext } from "astro"
import rss from "@astrojs/rss"
import { BlogQueries } from "@/features/blog/queries"
import { runBlog } from "@/features/blog/runtime"

export async function GET(context: APIContext) {
  const items = await runBlog(BlogQueries.use((queries) => queries.feed))

  return rss({
    title: "Effect Blog",
    description: "Releases, write-ups, and notes from the Effect team",
    site: context.site!,
    items: [...items],
    trailingSlash: false,
  })
}
