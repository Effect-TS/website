import * as Schema from "effect/Schema"

const CommonMetadata = {
  synced: Schema.Boolean,
  file_hash: Schema.String,
  git_branch: Schema.String,
  git_commit: Schema.String,
  uploaded_at: Schema.DateTimeUtcFromString,
} as const

export const DocumentationMetadata = Schema.Struct({
  ...CommonMetadata,
  content_source: Schema.Literal("documentation"),
  docs_version: Schema.String,
  file_path: Schema.String,
  group_label: Schema.String,
  page_href: Schema.String,
  page_label: Schema.String,
  page_title: Schema.String,
})

export const ApiReferenceMetadata = Schema.Struct({
  ...CommonMetadata,
  api_version: Schema.String,
  content_source: Schema.Literal("api-reference"),
  package_name: Schema.String,
  package_slug: Schema.String,
})

export const Metadata = Schema.Union([DocumentationMetadata, ApiReferenceMetadata])

export type Metadata = typeof Metadata.Type

export const DocumentationGeneratedMetadata = Schema.Struct({
  type: Schema.Literal("text"),
  docs_version: Schema.String,
  group_label: Schema.String,
  page_href: Schema.String,
  page_label: Schema.String,
  page_title: Schema.String,
  parent_section_anchor: Schema.String,
  parent_section_excerpt: Schema.String,
  parent_section_title: Schema.String,
  section_anchor: Schema.String,
  section_excerpt: Schema.String,
  section_level: Schema.Int,
  section_title: Schema.String,
})

export const ApiReferenceGeneratedMetadata = Schema.Struct({
  type: Schema.Literal("text"),
  declaration_anchor: Schema.String,
  declaration_kind: Schema.String,
  declaration_name: Schema.String,
  module_href: Schema.String,
  module_name: Schema.String,
  module_path: Schema.String,
  signature: Schema.String,
})

export const GeneratedMetadata = Schema.Union([
  ApiReferenceGeneratedMetadata,
  DocumentationGeneratedMetadata,
  Schema.Record(Schema.String, Schema.Unknown),
])

export type GeneratedMetadata = typeof GeneratedMetadata.Type

export const ScoredTextInputChunk = Schema.Struct({
  type: Schema.Literal("text"),
  model: Schema.String,
  text: Schema.String,
  score: Schema.Number,
  offset: Schema.optional(Schema.Int),
  metadata: Metadata,
  filename: Schema.String,
  file_id: Schema.String,
  store_id: Schema.String,
  chunk_index: Schema.Int,
  mime_type: Schema.String,
  generated_metadata: GeneratedMetadata,
})

export type ScoredTextInputChunk = typeof ScoredTextInputChunk.Type

export const StoreSearchResponse = Schema.Struct({
  object: Schema.Literal("list"),
  data: Schema.Array(ScoredTextInputChunk),
})

export type StoreSearchResponse = typeof StoreSearchResponse.Type

export const SearchResultChunk = Schema.Struct({
  id: Schema.String,
  detail: Schema.optional(Schema.String),
  href: Schema.String,
  title: Schema.String,
  snippet: Schema.String,
  score: Schema.Number,
})

export type SearchResultChunk = typeof SearchResultChunk.Type

export const DocumentationSearchResult = Schema.Struct({
  kind: Schema.Literal("documentation"),
  id: Schema.String,
  breadcrumbs: Schema.Array(Schema.String),
  title: Schema.String,
  description: Schema.String,
  href: Schema.String,
  version: Schema.String,
  chunks: Schema.Array(SearchResultChunk),
})
export type DocumentationSearchResult = typeof DocumentationSearchResult.Type

export const ApiReferenceSearchResult = Schema.Struct({
  kind: Schema.Literal("api-reference"),
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  href: Schema.String,
  packageName: Schema.String,
  version: Schema.String,
  chunks: Schema.Array(SearchResultChunk),
})
export type ApiReferenceSearchResult = typeof ApiReferenceSearchResult.Type

export const SearchResult = Schema.Union([DocumentationSearchResult, ApiReferenceSearchResult])
export type SearchResult = typeof SearchResult.Type

export class SearchError extends Schema.TaggedErrorClass<SearchError>()(
  "SearchError",
  { cause: Schema.Defect() },
  { httpApiStatus: 500 },
) {}
