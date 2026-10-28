import * as Schema from "effect/Schema"
import type { BlogChunkMetadata } from "@website/domain/SearchMetadata"
import { parseMarkdown } from "./Markdown.ts"
import { markdownChunks } from "./MarkdownChunks.ts"

const Frontmatter = Schema.Struct({
  title: Schema.String,
  excerpt: Schema.String,
  date: Schema.String,
  authors: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
  version: Schema.optional(Schema.Literals(["v3", "v4"])),
  draft: Schema.optional(Schema.Boolean),
})

export interface BlogChunk {
  readonly type: "text"
  readonly text: string
  readonly mime_type: "text/plain"
  readonly generated_metadata: BlogChunkMetadata
}

export interface BlogPage {
  readonly href: string
  /** The docs version the post is about, when it is about one. */
  readonly version: "v3" | "v4" | undefined
  readonly directory: string
  readonly name: string
  readonly chunks: ReadonlyArray<BlogChunk>
}

export function blogPage(
  source: string,
  relativePath: string,
): BlogPage | undefined {
  const parsed = parseMarkdown(source, "Blog post must have YAML frontmatter")
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.frontmatter)
  if (frontmatter.draft === true) return undefined

  const id = blogPostId(relativePath)
  const href = `/blog/${id}`
  const chunks = markdownChunks(source, parsed, {
    title: frontmatter.title,
    description: frontmatter.excerpt,
    context: `Effect blog · ${frontmatter.date}${
      frontmatter.tags.length === 0 ? "" : ` · ${frontmatter.tags.join(", ")}`
    }`,
  }).map(({ text, section }) => ({
    type: "text" as const,
    text,
    mime_type: "text/plain" as const,
    generated_metadata: {
      type: "text" as const,
      page_href: href,
      page_title: frontmatter.title,
      description: frontmatter.excerpt,
      published_at: frontmatter.date,
      authors: frontmatter.authors,
      tags: frontmatter.tags,
      section_title: section.title,
      section_anchor: section.anchor,
      excerpt: section.excerpt,
    },
  }))

  const parts = id.split("/")
  return {
    href,
    version: frontmatter.version,
    directory: ["blog", ...parts.slice(0, -1)].join("/"),
    name: parts.at(-1) ?? id,
    chunks,
  }
}

export function blogPostId(relativePath: string): string {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/, "")
    .replace(/(^|\/)index$/, "")
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => part.toLowerCase().replace(/\./g, ""))
    .join("/")
}
