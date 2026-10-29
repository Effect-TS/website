import * as Schema from "effect/Schema"
import type { DocumentationChunkMetadata } from "@website/domain/SearchMetadata"
import { parseMarkdown } from "./Markdown.ts"
import { markdownChunks } from "./MarkdownChunks.ts"

const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  draft: Schema.optional(Schema.Boolean),
  sidebar: Schema.optional(
    Schema.Struct({ label: Schema.optional(Schema.String) }),
  ),
})

export interface DocumentationChunk {
  readonly type: "text"
  readonly text: string
  readonly mime_type: "text/plain"
  readonly generated_metadata: DocumentationChunkMetadata
}

export interface DocumentationPage {
  readonly version: string
  readonly href: string
  /** Upload id: `<directory>/<name>-001.mxjson`. */
  readonly directory: string
  readonly name: string
  readonly chunks: ReadonlyArray<DocumentationChunk>
}

export function documentationPage(
  source: string,
  relativePath: string,
): DocumentationPage | undefined {
  const parsed = parseMarkdown(
    source,
    "Documentation file must have YAML frontmatter",
  )
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.frontmatter)
  if (frontmatter.draft === true) return undefined

  const pathParts = relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/, "")
    .split("/")
  const version = pathParts[0] ?? "unknown"
  const group = pathParts.length > 2 ? (pathParts[1] ?? "") : ""
  const pageLabel = frontmatter.sidebar?.label ?? frontmatter.title
  const breadcrumbs = [titleCase(group), pageLabel].filter(
    (label) => label.length > 0,
  )
  const routePath = pathParts.join("/").replace(/(^|\/)index$/, "")
  const href = `/docs/${routePath}`.replace(/\/+$/, "/")

  const chunks = markdownChunks(source, parsed, {
    title: frontmatter.title,
    description: frontmatter.description,
    context: `${breadcrumbs.join(" › ")} · Effect ${version} docs`,
  }).map(({ text, section, parent }) => ({
    type: "text" as const,
    text,
    mime_type: "text/plain" as const,
    generated_metadata: {
      type: "text" as const,
      page_href: href,
      page_title: frontmatter.title,
      breadcrumbs,
      parent_title: parent.title,
      parent_anchor: parent.anchor,
      parent_excerpt: parent.excerpt,
      section_title: section.title,
      section_anchor: section.anchor,
      excerpt: section.excerpt,
    },
  }))

  return {
    version,
    href,
    directory: ["documentation", ...pathParts.slice(0, -1)].join("/"),
    name: pathParts.at(-1) ?? "index",
    chunks,
  }
}

function titleCase(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
