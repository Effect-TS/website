import * as Schema from "effect/Schema"

export const HeadingInfo = Schema.Struct({
  level: Schema.Int,
  text: Schema.String,
})

export type HeadingInfo = typeof HeadingInfo.Type

const CommonMetadata = {
  synced: Schema.Boolean,
  file_hash: Schema.String,
  git_branch: Schema.String,
  git_commit: Schema.String,
  uploaded_at: Schema.DateTimeUtcFromString,
} as const

export const GuideMetadata = Schema.Struct({
  ...CommonMetadata,
  content_source: Schema.optional(Schema.Literal("docs")),
  file_path: Schema.String,
})

export const ApiReferenceMetadata = Schema.Struct({
  ...CommonMetadata,
  api_version: Schema.String,
  content_source: Schema.Literal("api-reference"),
  package_name: Schema.String,
  package_slug: Schema.String,
})

export const Metadata = Schema.Union([GuideMetadata, ApiReferenceMetadata])

export type Metadata = typeof Metadata.Type

export const GuideGeneratedMetadata = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  chunk_headings: Schema.Array(HeadingInfo),
  heading_context: Schema.Array(HeadingInfo),
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
  GuideGeneratedMetadata,
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

export const GuideSearchResult = Schema.Struct({
  kind: Schema.Literal("guide"),
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  href: Schema.String,
  chunks: Schema.Array(SearchResultChunk),
})

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

export const SearchResult = Schema.Union([GuideSearchResult, ApiReferenceSearchResult])

export type SearchResult = typeof SearchResult.Type

export class SearchError extends Schema.TaggedErrorClass<SearchError>()(
  "SearchError",
  {
    cause: Schema.Defect(),
  },
  { httpApiStatus: 500 },
) {}
