import { getRSSOptions } from "@/lib/rss/podcast"
import rss from "@astrojs/rss"
import type { APIRoute, GetStaticPathsResult } from "astro"

export function getStaticPaths() {
  return [
    {
      params: {
        prefix: "podcast"
      }
    }
  ] satisfies GetStaticPathsResult
}

export const GET: APIRoute = async ({ site }) => {
  return rss(await getRSSOptions(site))
}
