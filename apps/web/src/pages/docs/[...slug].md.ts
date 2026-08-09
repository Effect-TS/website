import type { APIRoute, GetStaticPaths } from "astro"
import { getCollection } from "astro:content"

interface MarkdownPageProps {
  readonly markdown: string
  readonly title: string
}

const ensureTitle = (markdown: string, title: string): string => {
  const body = markdown.trimStart()
  const firstLine = body.split(/\r?\n/, 1)[0]
  const normalizedTitle = title.trim().toLowerCase()
  const normalizedFirstLine = firstLine
    ?.replace(/^#+\s*/, "")
    .trim()
    .toLowerCase()

  if (firstLine?.startsWith("#") && normalizedFirstLine === normalizedTitle) {
    return body
  }

  return body.length > 0 ? `# ${title}\n\n${body}` : `# ${title}\n`
}

export const getStaticPaths = (async () => {
  const entries = await getCollection("docs")

  return entries.map((entry) => ({
    params: { slug: entry.id.replace(/\/index$/, "") },
    props: {
      markdown: ensureTitle(entry.body ?? "", entry.data.title),
      title: entry.data.title,
    } satisfies MarkdownPageProps,
  }))
}) satisfies GetStaticPaths

export const GET: APIRoute<MarkdownPageProps> = ({ props }) =>
  new Response(props.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": `inline; filename="${encodeURIComponent(props.title)}.md"`,
    },
  })
