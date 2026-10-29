import * as Schema from "effect/Schema"

/** One heading of a page, with the text that starts under it. */
export const SearchSection = Schema.Struct({
  line: Schema.Int,
  level: Schema.Int,
  title: Schema.String,
  anchor: Schema.String,
  parent_anchor: Schema.String,
  excerpt: Schema.String,
})
export type SearchSection = typeof SearchSection.Type

const ChunkSection = {
  section_title: Schema.String,
  section_anchor: Schema.String,
  excerpt: Schema.String,
} as const

/** Chunk metadata of a documentation page; the section is its h2 or h3. */
export const DocumentationChunkMetadata = Schema.Struct({
  type: Schema.Literal("text"),
  page_href: Schema.String,
  page_title: Schema.String,
  breadcrumbs: Schema.Array(Schema.String),
  parent_title: Schema.String,
  parent_anchor: Schema.String,
  parent_excerpt: Schema.String,
  ...ChunkSection,
})
export type DocumentationChunkMetadata = typeof DocumentationChunkMetadata.Type

/** Chunk metadata of a blog post. */
export const BlogChunkMetadata = Schema.Struct({
  type: Schema.Literal("text"),
  page_href: Schema.String,
  page_title: Schema.String,
  description: Schema.String,
  published_at: Schema.String,
  authors: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
  ...ChunkSection,
})
export type BlogChunkMetadata = typeof BlogChunkMetadata.Type
