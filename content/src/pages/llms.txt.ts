import { getCollection } from "astro:content"
import type { APIRoute } from "astro"

const docs = await getCollection("docs", (entry) =>
  entry.id.startsWith("docs/")
)

export const GET: APIRoute = async ({ site }) => {
  return new Response(
    `# Effect Documentation for LLMs

> Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs.

## Docs

${docs
  .map((doc) => {
    const url = new URL(doc.id, site)
    return `- [${doc.data.title}](${url.href}/): ${doc.data.description}\n`
  })
  .join("")}

## API

- [API List](https://tim-smart.github.io/effect-io-ai/): A succint list of all functions and methods in Effect.
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )
}
