import * as Schema from "effect/Schema"
import {
  countLines,
  frontmatterLines,
  parseMarkdown,
  sections,
  serializeSearchFrontmatter,
  spliceFrontmatter,
} from "./Markdown.ts"
import { BlogStagedSearchMetadata } from "./SearchMetadata.ts"

export const SearchMetadata = BlogStagedSearchMetadata
export type SearchMetadata = typeof BlogStagedSearchMetadata.Type

const Frontmatter = Schema.Struct({
  title: Schema.String,
  excerpt: Schema.String,
  date: Schema.String,
  authors: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
  draft: Schema.optional(Schema.Boolean),
})
const FrontmatterRecord = Schema.Record(Schema.String, Schema.Unknown)

export interface StagedBlogPost {
  readonly source: string
  readonly metadata: SearchMetadata
}

export function stageBlogPost(
  source: string,
  relativePath: string,
): StagedBlogPost | undefined {
  const parsed = parseMarkdown(source, "Blog post must have YAML frontmatter")
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.frontmatter)
  const frontmatterRecord = Schema.decodeUnknownSync(FrontmatterRecord)(
    parsed.frontmatter,
  )
  if (frontmatter.draft === true) return undefined

  const originalSections = sections(
    parsed.tree,
    frontmatter.title,
    frontmatter.excerpt,
  )
  const baseMetadata: SearchMetadata = {
    schema_version: 1,
    content_source: "blog",
    page_href: `/blog/${blogPostId(relativePath)}`,
    page_title: frontmatter.title,
    description: frontmatter.excerpt,
    published_at: frontmatter.date,
    authors: frontmatter.authors,
    tags: frontmatter.tags,
    sections: originalSections,
  }
  const provisionalFrontmatter = serializeSearchFrontmatter(
    frontmatterRecord,
    baseMetadata,
    "blog",
  )
  const lineDelta =
    countLines(provisionalFrontmatter) -
    frontmatterLines(parsed, "Blog frontmatter is missing source lines")
  const metadata: SearchMetadata = {
    ...baseMetadata,
    sections: originalSections.map((section) => ({
      ...section,
      line: section.line === 1 ? 1 : section.line + lineDelta,
    })),
  }
  const finalFrontmatter = serializeSearchFrontmatter(
    frontmatterRecord,
    metadata,
    "blog",
  )
  if (countLines(finalFrontmatter) !== countLines(provisionalFrontmatter)) {
    throw new Error(
      `Blog metadata changed frontmatter height for ${relativePath}`,
    )
  }
  return {
    source: spliceFrontmatter(
      source,
      parsed,
      finalFrontmatter,
      "Blog frontmatter is missing source offsets",
    ),
    metadata,
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
