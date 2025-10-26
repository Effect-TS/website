import type { MiddlewareHandler } from "astro"
import { getMarkdownById } from "@/lib/markdown-map"

const respondWithMarkdown = (markdown: string) =>
  new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  })

const normalizePath = (pathname: string) => pathname.replace(/^\/+/, "")
const stripMarkdownExtension = (slug: string) => slug.replace(/\.md$/i, "")

const isDocsMarkdownPath = (pathname: string) => pathname.startsWith("docs/")

export const onRequest: MiddlewareHandler = async (context, next) => {
  const pathname = context.url.pathname

  if (!pathname.endsWith(".md")) {
    return next()
  }

  const slug = stripMarkdownExtension(normalizePath(pathname))
  if (!isDocsMarkdownPath(slug)) {
    return next()
  }

  const markdown = getMarkdownById(slug)
  if (!markdown) {
    return new Response("Not found", { status: 404 })
  }

  return respondWithMarkdown(markdown)
}
