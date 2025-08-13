import * as Schema from "effect/Schema"

export const HeadingInfo = Schema.Struct({
  level: Schema.Int,
  text: Schema.String
})

export type HeadingInfo = typeof HeadingInfo.Type

export const Metadata = Schema.Struct({
  synced: Schema.Boolean,
  fileHash: Schema.String.pipe(
    Schema.propertySignature,
    Schema.fromKey("file_hash")
  ),
  filePath: Schema.String.pipe(
    Schema.propertySignature,
    Schema.fromKey("file_path")
  ),
  gitBranch: Schema.String.pipe(
    Schema.propertySignature,
    Schema.fromKey("git_branch")
  ),
  gitCommit: Schema.String.pipe(
    Schema.propertySignature,
    Schema.fromKey("git_commit")
  ),
  uploadedAt: Schema.DateTimeUtc.pipe(
    Schema.propertySignature,
    Schema.fromKey("uploaded_at")
  )
})

export type Metadata = typeof Metadata.Type

export const GeneratedMetadata = Schema.Struct({
  title: Schema.String,
  description: Schema.optionalWith(Schema.String, {
    exact: true,
    nullable: true,
    default: () => ""
  }),
  language: Schema.String,
  sidebar: Schema.String,
  order: Schema.String,
  fileType: Schema.Literal("text/markdown").pipe(
    Schema.propertySignature,
    Schema.fromKey("file_type")
  ),
  fileSize: Schema.Int.pipe(
    Schema.propertySignature,
    Schema.fromKey("file_size")
  ),
  wordCount: Schema.Int.pipe(
    Schema.propertySignature,
    Schema.fromKey("word_count")
  ),
  chunkHeadings: Schema.Array(HeadingInfo).pipe(
    Schema.propertySignature,
    Schema.fromKey("chunk_headings")
  ),
  headingContext: Schema.Array(HeadingInfo).pipe(
    Schema.propertySignature,
    Schema.fromKey("heading_context")
  )
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
  fileId: Schema.String.pipe(
    Schema.propertySignature,
    Schema.fromKey("file_id")
  ),
  vectorStoreId: Schema.String.pipe(
    Schema.propertySignature,
    Schema.fromKey("vector_store_id")
  ),
  chunkIndex: Schema.Int.pipe(
    Schema.propertySignature,
    Schema.fromKey("chunk_index")
  ),
  mimeType: Schema.Literal("text/markdown").pipe(
    Schema.propertySignature,
    Schema.fromKey("mime_type")
  ),
  generatedMetadata: GeneratedMetadata.pipe(
    Schema.propertySignature,
    Schema.fromKey("generated_metadata")
  )
})

export type ScoredTextInputChunk = typeof ScoredTextInputChunk.Type

export const VectorStoreSearchResponse = Schema.Struct({
  object: Schema.Literal("list"),
  data: Schema.Array(ScoredTextInputChunk)
})

export type VectorStoreSearchResponse = typeof VectorStoreSearchResponse.Type

export const SearchResultChunk = Schema.Struct({
  id: Schema.String,
  anchorId: Schema.String,
  title: Schema.String,
  snippet: Schema.String,
  score: Schema.Number
})

export type SearchResultChunk = typeof SearchResultChunk.Type

export const SearchResult = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  href: Schema.String,
  chunks: Schema.Array(SearchResultChunk)
})

export type SearchResult = typeof SearchResult.Type

export class SearchError extends Schema.TaggedError<SearchError>()("SearchError", {
  cause: Schema.Defect,
}) { }
