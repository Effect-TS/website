import * as Schema from "effect/Schema"

export const HeadingInfo = Schema.Struct({
  level: Schema.Int,
  text: Schema.String,
})

export type HeadingInfo = typeof HeadingInfo.Type

export const Metadata = Schema.Struct({
  synced: Schema.Boolean,
  file_hash: Schema.String,
  file_path: Schema.String,
  git_branch: Schema.String,
  git_commit: Schema.String,
  uploaded_at: Schema.DateTimeUtcFromString,
})

export type Metadata = typeof Metadata.Type

export const GeneratedMetadata = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  language: Schema.String,
  sidebar: Schema.Struct({
    label: Schema.optional(Schema.String),
    order: Schema.Int,
  }),
  file_type: Schema.Literal("text/markdown"),
  file_size: Schema.Int,
  word_count: Schema.Int,
  chunk_headings: Schema.Array(HeadingInfo),
  heading_context: Schema.Array(HeadingInfo),
})

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
  mime_type: Schema.Literal("text/markdown"),
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
  anchorId: Schema.String,
  title: Schema.String,
  snippet: Schema.String,
  score: Schema.Number,
})

export type SearchResultChunk = typeof SearchResultChunk.Type

export const SearchResult = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  href: Schema.String,
  chunks: Schema.Array(SearchResultChunk),
})

export type SearchResult = typeof SearchResult.Type

export class SearchError extends Schema.TaggedErrorClass<SearchError>()(
  "SearchError",
  {
    cause: Schema.Defect(),
  },
  { httpApiStatus: 500 },
) {}
