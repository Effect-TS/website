import { getCollection } from "astro:content"
import type { APIRoute } from "astro"

const docs = await getCollection("docs", (entry) =>
  entry.id.startsWith("docs/")
)

export const GET: APIRoute = async ({ site }) => {
  return new Response(
    `<SYSTEM>This is the full developer documentation for Effect.</SYSTEM>

# Start of Effect documentation

${docs
  .map((doc) => {
    const url = new URL(doc.id, site)
    return `# [${doc.data.title}](${url.href}/)\n\n## Overview\n\n${doc.body}\n\n`
  })
  .join("")}
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )
}
