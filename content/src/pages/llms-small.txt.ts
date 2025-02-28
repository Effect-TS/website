import { getCollection } from "astro:content"
import type { APIRoute } from "astro"

const docs = await getCollection("docs", (entry) =>
  entry.id.startsWith("docs/")
)

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Replace multiple spaces/newlines with a single space
    .trim() // Trim leading and trailing whitespace
}

export const GET: APIRoute = async ({ site }) => {
  return new Response(
    `<SYSTEM>This is the abridged developer documentation for Effect.</SYSTEM>

# Start of Effect documentation

${docs
  .map((doc) => {
    const url = new URL(doc.slug, site)
    return `# [${doc.data.title}](${url.href}/)\n\n${cleanText(
      "## Overview\n\n" + doc.body
    )}\n\n`
  })
  .join("")}
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )
}
