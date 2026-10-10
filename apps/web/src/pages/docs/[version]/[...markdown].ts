import type { APIRoute } from "astro"
import { getCollection } from "astro:content"
import {
  MARKDOWN_DOCS_VERSIONS,
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

export async function getStaticPaths() {
  const entries = await getCollection("docs", (entry) =>
    MARKDOWN_DOCS_VERSIONS.some((version) =>
      entry.id.startsWith(`${version}/`),
    ),
  )
  return entries.map((entry) => {
    const [version = "", ...rest] = entry.id.split("/")
    return {
      params: {
        version,
        markdown: markdownSlugForDocId(rest.join("/")),
      },
      props: { entry },
      // The handler reads nothing beyond this entry, so its content digest is
      // an exact cache key. Unlike the `.astro` docs route this never calls
      // `render()`, so Astro's automatic content-entry tracking does not apply.
      cacheKey: entry.digest,
    }
  })
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
