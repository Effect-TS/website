import type { APIRoute } from "astro"
import { getCollection } from "astro:content"
import {
  docsPageToMarkdown,
  markdownSlugForDocId,
} from "@/features/docs/markdown"

/**
 * Serves docs pages as plain markdown by appending `.md` to the page URL
 * (e.g. `/docs/v4/getting-started/introduction.md`).
 *
 * The endpoint is fully prerendered at build time, so markdown is served as a
 * static file without invoking any backend at request time.
 */
export const prerender = true

/** Docs version whose pages are also available as markdown. */
const VERSION = "v4"

export async function getStaticPaths() {
  const entries = await getCollection("docs", (entry) =>
    entry.id.startsWith(`${VERSION}/`),
  )
  return entries.map((entry) => ({
    params: {
      version: VERSION,
      markdown: markdownSlugForDocId(entry.id.slice(VERSION.length + 1)),
    },
    props: { entry },
    // The handler reads nothing beyond this entry, so its content digest is an
    // exact cache key. Unlike the `.astro` docs route this never calls
    // `render()`, so Astro's automatic content-entry tracking does not apply.
    cacheKey: entry.digest,
  }))
}

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as {
    entry: { data: { title: string }; body?: string }
  }
  return new Response(
    docsPageToMarkdown({ title: entry.data.title, body: entry.body ?? "" }),
    {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    },
  )
}
