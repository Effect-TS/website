import * as Schema from "effect/Schema"

export const SearchSection = Schema.Struct({
  line: Schema.Int,
  level: Schema.Int,
  title: Schema.String,
  anchor: Schema.String,
  parent_anchor: Schema.String,
  excerpt: Schema.String,
})
export type SearchSection = typeof SearchSection.Type

export const DocumentationStagedSearchMetadata = Schema.Struct({
  schema_version: Schema.Literal(1),
  content_source: Schema.Literal("documentation"),
  docs_version: Schema.String,
  breadcrumbs: Schema.Array(Schema.String),
  page_href: Schema.String,
  page_label: Schema.String,
  page_title: Schema.String,
  sections: Schema.Array(SearchSection),
})
export type DocumentationStagedSearchMetadata =
  typeof DocumentationStagedSearchMetadata.Type

export const BlogStagedSearchMetadata = Schema.Struct({
  schema_version: Schema.Literal(1),
  content_source: Schema.Literal("blog"),
  page_href: Schema.String,
  page_title: Schema.String,
  description: Schema.String,
  published_at: Schema.String,
  authors: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
  sections: Schema.Array(SearchSection),
})
export type BlogStagedSearchMetadata = typeof BlogStagedSearchMetadata.Type

export const DocumentationSearchSection = SearchSection

export const DocumentationSearchMetadata = Schema.Struct({
  ...DocumentationStagedSearchMetadata.fields,
  sections: Schema.Array(Schema.fromJsonString(SearchSection)),
})

export const BlogSearchMetadata = Schema.Struct({
  ...BlogStagedSearchMetadata.fields,
  sections: Schema.Array(Schema.fromJsonString(SearchSection)),
})
